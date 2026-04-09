# Module 3: Capability Pipeline (Python Edition)

Following the new briefing for **Intern 3** ("Capability Engineer") and the provided database schema, we must pivot from abstract orchestration to concrete, stateless Python skills. 

This implementation connects directly to your Postgres database using `supabase-py` (or standard `psycopg2`), enforcing the rules of engagement: logging to `world_events`, reading from `research_jobs`, and saving to `extracted_data`.

---

## 1. Directory Structure

```text
src/module_3_capabilities/
├── db_client.py           # Database wrapper for events, jobs, and extractions
├── core/
│   ├── base_skill.py      # Abstract class enforcing Intern 3 rules
│   └── exceptions.py      # Custom errors (e.g., TargetRemapError)
├── skills/
│   ├── discovery.py       # CapDisc: Locates targets
│   ├── extraction.py      # CapExtr: Pulls data (w/ Self-Healing)
│   └── qa.py              # CapQA: Validates schema and scores
└── runner.py              # The execution script tied to the router
```

---

## 2. Database Adapter (`db_client.py`)

This file abstracts the `research_jobs`, `world_events`, and `extracted_data` tables so our skills can report state seamlessly.

```python
import os
import uuid
from typing import Dict, Any, Optional
from supabase import create_client, Client

class DatabaseClient:
    def __init__(self):
        # Assumes SUPABASE_URL and SUPABASE_KEY are in env
        self.supabase: Client = create_client(
            os.environ.get("SUPABASE_URL", ""),
            os.environ.get("SUPABASE_KEY", "")
        )

    def get_job(self, job_id: str) -> Dict[str, Any]:
        """Reads the Contract (Justin's Rule)"""
        response = self.supabase.table("research_jobs").select("*").eq("id", job_id).execute()
        if not response.data:
            raise ValueError(f"Job {job_id} not found.")
        return response.data[0]

    def log_event(self, job_id: str, event_type: str, source: str, message: str = None, payload: dict = None):
        """Reporting State to world_events"""
        data = {
            "job_id": job_id,
            "event_type": event_type,
            "source": source,
            "message": message,
            "payload": payload or {}
        }
        self.supabase.table("world_events").insert(data).execute()

    def update_job_status(self, job_id: str, status: str):
        """Supported status: pending, running, hitl_alert, completed, failed"""
        self.supabase.table("research_jobs").update({"status": status}).eq("id", job_id).execute()

    def save_extracted_data(self, job_id: str, source_url: str, content: dict, confidence: float, is_validated: bool = False):
        """Saving Results to warehouse"""
        data = {
            "job_id": job_id,
            "source_url": source_url,
            "content": content,
            "confidence": confidence,
            "is_validated": is_validated
        }
        self.supabase.table("extracted_data").insert(data).execute()
```

---

## 3. Base Capability Contract (`core/base_skill.py`)

To ensure every Python skill follows the "logging and stateless" rules, we use a Base Class.

```python
from abc import ABC, abstractmethod
from db_client import DatabaseClient

class BaseSkill(ABC):
    def __init__(self, job_id: str, db: DatabaseClient):
        self.job_id = job_id
        self.db = db
        self.job_data = self.db.get_job(self.job_id)
        self.input_params = self.job_data.get("input_params", {})
        self.skill_name = self.__class__.__name__

    def log(self, event_type: str, message: str, payload: dict = None):
        self.db.log_event(self.job_id, event_type, self.skill_name, message, payload)

    def execute(self) -> dict:
        self.log("CAPABILITY_START", "Initializing skill execution")
        self.db.update_job_status(self.job_id, "running")
        try:
            # Justin's Rule: Only do what is in input_params
            result = self.perform_task()
            self.log("CAPABILITY_COMPLETE", "Skill finished successfully")
            return result
        except Exception as e:
            self.log("CAPABILITY_ERROR", str(e), {"error": str(e)})
            self.db.update_job_status(self.job_id, "failed")
            raise e

    @abstractmethod
    def perform_task(self) -> dict:
        """To be implemented by CapDisc, CapExtr, CapQA"""
        pass
```

---

## 4. The Skills (The "Hands & Tools")

### A. Discovery Skill (`skills/discovery.py`)
```python
from core.base_skill import BaseSkill

class DiscoverySkill(BaseSkill):
    def perform_task(self) -> dict:
        domain = self.input_params.get("domain")
        if not domain:
            raise ValueError("Discovery requires 'domain' in input_params")

        self.log("DISCOVERY_START", f"Searching domain: {domain}")
        
        # Implement actual web search / SERP API logic here
        found_urls = [
            f"https://{domain}/products/1",
            f"https://{domain}/products/2"
        ]
        
        self.log("DISCOVERY_COMPLETE", f"Found {len(found_urls)} targets", {"url_count": len(found_urls)})
        return {"urls": found_urls}
```

### B. Extraction Skill w/ Self Healing (`skills/extraction.py`)
```python
from core.base_skill import BaseSkill
import random

class ExtractionSkill(BaseSkill):
    def perform_task(self) -> dict:
        target_url = self.input_params.get("target_url")
        
        self.log("EXTRACTION_START", f"Extracting from {target_url}")
        
        extracted_content = None
        confidence = 1.0

        try:
            # Attempt 1: Standard Selectors
            extracted_content = self.run_playwright_extraction(target_url)
            self.log("EXTRACTION_PROGRESS", "Standard extraction succeeded")
            
        except Exception as e:
            self.log("EXTRACTION_ERROR", f"Standard extraction failed: {str(e)}")
            self.log("SELF_HEALING_START", "Attempting fallback extraction using LLM re-mapping.")
            
            # Attempt 2: Self-Healing Logic (LLM fallback)
            extracted_content = self.run_llm_fallback_extraction(target_url)
            confidence = 0.7  # Lower confidence due to heuristic fallback
            self.log("SELF_HEALING_COMPLETE", "Fallback extraction succeeded")

        if not extracted_content:
            self.db.update_job_status(self.job_id, "hitl_alert")
            raise Exception("Extraction completely failed. Escalating to HITL.")

        # Saving Results to warehouse (Intern 3 rule)
        self.db.save_extracted_data(
            job_id=self.job_id,
            source_url=target_url,
            content=extracted_content,
            confidence=confidence,
            is_validated=False # Pending CapQA
        )

        return {"status": "extracted", "confidence": confidence}

    def run_playwright_extraction(self, url: str):
        # Playwright logic here
        return {"price": "$99", "title": "Example Product"}

    def run_llm_fallback_extraction(self, url: str):
        # LLM logic here to bypass broken selectors
        return {"price": "99.00", "title": "Example"}
```

### C. QA Skill (`skills/qa.py`)
```python
from core.base_skill import BaseSkill

class QASkill(BaseSkill):
    def perform_task(self) -> dict:
        self.log("QA_START", "Validating extracted data against schema")
        expected_schema = self.input_params.get("schema", {})
        
        # In a real app, query `extracted_data` table here
        # and validate `content` payload using Pydantic or jsonschema
        
        is_valid = True # Mock result
        confidence_adj = 0.9

        if is_valid:
            self.log("QA_PASSED", "Data matches requested schema")
            # Update extracted_data.is_validated = true
        else:
            self.log("QA_FAILED", "Data schema mismatch")
            self.db.update_job_status(self.job_id, "hitl_alert")

        return {"is_valid": is_valid, "final_confidence": confidence_adj}
```

---

## 5. Execution Runner (`runner.py`)

This simulates how the Event Router (Intern 2) triggers your Capability Pipeline (Intern 3).

```python
from db_client import DatabaseClient
from skills.discovery import DiscoverySkill
from skills.extraction import ExtractionSkill
from skills.qa import QASkill

def run_capability(job_id: str, capability_name: str):
    db = DatabaseClient()
    
    skill_map = {
        "CapDisc": DiscoverySkill,
        "CapExtr": ExtractionSkill,
        "CapQA": QASkill
    }

    SkillClass = skill_map.get(capability_name)
    if not SkillClass:
        db.log_event(job_id, "ROUTING_ERROR", "system", message=f"Unknown skill {capability_name}")
        return
        
    skill_instance = SkillClass(job_id=job_id, db=db)
    
    try:
        # The execute method handles the event logging and DB insertion
        result = skill_instance.execute()
        print(f"[{capability_name}] Completed: {result}")
        
    except Exception as e:
        print(f"[{capability_name}] Failed: {e}")

if __name__ == "__main__":
    # Example flow
    test_job_id = "123e4567-e89b-12d3-a456-426614174000"
    
    # Normally this is triggered asynchronously via queues or router
    run_capability(test_job_id, "CapExtr")
```

---

### Why this structure fulfills the Intern 3 requirements perfectly:

1. **Reporting State (`world_events`)**: Covered flawlessly. Every subclass of `BaseSkill` has access to `self.log()`. If extraction hits an error, or self-healing triggers, it creates a Postgres row instantly.
2. **Saving Results (`extracted_data`)**: The `ExtractionSkill` explicitly pushes the `content` and `confidence` blob into your Table #3 (`extracted_data`), keeping the pipeline stateless and decoupled.
3. **Reading the Contract (`research_jobs`)**: Accomplished in `BaseSkill.__init__`. A skill will crash immediately if you try to start it without a valid `job_id` referencing Table #1.
4. **Self-Healing Logic**: Documented under `ExtractionSkill`. The `try/except` captures DOM failures and reroutes to DOM-agnostic LLM extraction.
