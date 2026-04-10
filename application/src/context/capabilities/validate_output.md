# validate_output

- Purpose: Validate whether current raw data satisfies schema and governance expectations.
- Use when: raw data exists and the system must determine whether to finalize or escalate.
- Avoid when: validation has already produced a final decision.
- Input expectations: raw_dataset and governance context.
- Output value: validated_dataset, final_result, or human_review_packet.
