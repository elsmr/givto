import * as v from 'valibot';

const schemaIssues = ['required', 'no_urls', 'no_at_sign', 'no_line_breaks', 'invalid_price_range'] as const;

/** Message keys under `group.issues`. */
export type FieldIssue = (typeof schemaIssues)[number] | 'too_long' | 'invalid' | 'invalid_email';

/**
 * Runs the server's own schema on a field (lib/schema check messages are stable codes), so
 * the form shows the same rule the API enforces. Null when the value is fine.
 */
export const fieldIssue = (schema: v.GenericSchema, value: unknown): FieldIssue | null => {
  const result = v.safeParse(schema, value);
  if (result.success) return null;
  const [issue] = result.issues;
  return schemaIssues.find((known) => known === issue.message) ?? (issue.type === 'max_length' ? 'too_long' : 'invalid');
};
