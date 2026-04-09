# acquire_execution_context

- Purpose: Prepare runtime prerequisites such as execution session, proxy profile, or budget-aware runtime context.
- Use when: execution requires runtime context and none is currently available.
- Avoid when: execution_session already exists and is still usable.
- Input expectations: extraction_plan or equivalent execution intent.
- Output value: execution_session artifact.
