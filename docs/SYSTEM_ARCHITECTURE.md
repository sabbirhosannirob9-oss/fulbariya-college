# 🏗️ Promote System — Architecture

**Fulbariya College**
**Version:** 1.0
**For:** Developers

---

## 🎯 System Overview

Automated Promote System যা result থেকে Pass/Fail detect করে students-দের পরবর্তী শ্রেণিতে promote করে — complete audit trail সহ।

---

## 📊 Database Schema

### New Tables (৪টি)

#### 1. `promotion_log`

প্রতিটি Promote operation-এর master record।

| Column | Type | Description |
|---|---|---|
| `id` | BIGSERIAL | Primary key |
| `batch_id` | UUID | Unique batch identifier |
| `performed_by` | UUID | Admin ID |
| `performed_by_name` | TEXT | Admin name |
| `performed_at` | TIMESTAMPTZ | Timestamp |
| `source_class` | TEXT | From class |
| `source_year` | TEXT | From year |
| `source_branch` | TEXT | HSC/BM |
| `target_class` | TEXT | To class |
| `target_year` | TEXT | To year |
| `target_session` | TEXT | New session |
| `total_students` | INTEGER | Total count |
| `promoted_count` | INTEGER | Successfully promoted |
| `failed_count` | INTEGER | Failed |
| `absent_count` | INTEGER | Absent |
| `no_result_count` | INTEGER | No result |
| `target_deleted_count` | INTEGER | Deleted from target |
| `status` | TEXT | completed/failed/rolled_back |
| `error_message` | TEXT | Error if failed |
| `notes` | TEXT | Extra notes |

**Indexes:**
- `idx_promotion_batch` on `batch_id`
- `idx_promotion_date` on `performed_at`
- `idx_promotion_source` on `(source_class, source_year)`

---

#### 2. `promotion_audit`

প্রতিটি student-এর old & new data snapshot।

| Column | Type | Description |
|---|---|---|
| `id` | BIGSERIAL | Primary key |
| `batch_id` | UUID | Link to promotion_log |
| `student_id` | BIGINT | Original student ID |
| `student_name` | TEXT | Name |
| `student_roll` | TEXT | Roll |
| `old_student_data` | JSONB | Snapshot |
| `old_subjects` | JSONB | Old subjects |
| `old_result_data` | JSONB | Result data |
| `new_student_id` | BIGINT | New student ID |
| `new_student_data` | JSONB | New snapshot |
| `new_subjects` | JSONB | New subjects |
| `result_status` | TEXT | pass/fail/no_result |
| `total_gpa` | NUMERIC | GPA |
| `total_marks` | INTEGER | Marks |
| `action_type` | TEXT | promoted/skipped |
| `created_at` | TIMESTAMPTZ | — |

**Indexes:**
- `idx_audit_batch` on `batch_id`
- `idx_audit_student` on `student_id`
- `idx_audit_new_student` on `new_student_id`

---

#### 3. `promotion_rules`

Pass/Fail determination rules।

| Column | Type | Description |
|---|---|---|
| `id` | BIGSERIAL | Primary key |
| `rule_name` | TEXT | Display name |
| `rule_key` | TEXT | Unique key |
| `rule_value` | TEXT | Value |
| `rule_description` | TEXT | Description |
| `is_active` | BOOLEAN | Active? |
| `created_at` | TIMESTAMPTZ | — |

**Default Rules:**

| rule_key | Default value |
|---|---|
| `min_gpa` | `2.00` |
| `no_fail_subjects` | `true` |
| `absent_is_fail` | `true` |
| `no_result_action` | `skip` |
| `optional_bonus` | `true` |

---

#### 4. `academic_years`

Year/Session centralized management।

| Column | Type | Description |
|---|---|---|
| `id` | BIGSERIAL | Primary key |
| `year` | TEXT | Year (unique) |
| `session` | TEXT | Session |
| `start_date` | DATE | — |
| `end_date` | DATE | — |
| `is_active` | BOOLEAN | — |
| `is_current` | BOOLEAN | Current year |
| `display_name` | TEXT | Bangla name |

---

### Columns Added to Existing Tables

#### `students` Table

| Column | Type | Description |
|---|---|---|
| `promoted_in_batch` | UUID | Batch ID |
| `previous_batch` | UUID | Previous batch |
| `promoted_at` | TIMESTAMPTZ | Timestamp |
| `academic_year_id` | BIGINT | FK to academic_years |

**Indexes:**
- `idx_students_batch` on `promoted_in_batch`
- `idx_students_prev_batch` on `previous_batch`
- `idx_students_year_active` on `(year, is_active, class_name, branch)`

---

#### `subjects` Table

| Column | Type | Description |
|---|---|---|
| `paired_with_id` | BIGINT | FK to subjects (self) |
| `is_promote_relevant` | BOOLEAN | — |
| `notes` | TEXT | — |

**Index:**
- `idx_subjects_paired` on `paired_with_id`

---

#### `results` Table

| Column | Type | Description |
|---|---|---|
| `is_final_result` | BOOLEAN | Is this final? |
| `promotion_used` | BOOLEAN | Used for promotion? |
| `promotion_batch_id` | UUID | Batch ID |

**Indexes:**
- `idx_results_promotion` on `promotion_batch_id`
- `idx_results_final` on `is_final_result`

---

## 🔧 File Structure

```
FULBARIYA COLLEGE/
├── admin-pages/
│   ├── admin-promote.html              Main promote page
│   ├── admin-promote-history.html      Batch history
│   └── admin-promote-settings.html     Rules settings
│
├── js/
│   ├── promote-utils.js                Utilities (Pass/Fail, Pairing)
│   ├── promote-engine.js               Core engine (execute, audit)
│   ├── promote-restore.js              Restore/rollback
│   ├── promote-rules.js                Rules manager
│   ├── admin-promote.js                Main page logic
│   ├── admin-promote-history.js        History page logic
│   └── admin-promote-settings.js       Settings page logic
│
├── docs/
│   ├── PROMOTION_GUIDE.md              Admin guide
│   ├── SYSTEM_ARCHITECTURE.md          This file
│   └── TEST_PLAN.md                    Test plan
│
└── database/
    └── schema.sql                       Reference schema
```

---

## 🔄 Data Flow

### Load Students Flow

```
User clicks "Load Students"
       ↓
admin-promote.js : loadStudents()
       ↓
FDCPromoteUtils.detectPassFail()
       ↓
Query 1: students table
         (source class/year/branch)
       ↓
Query 2: results table
         (final exam, published)
       ↓
Query 3: result_details
         (subject-level pass/fail)
       ↓
Apply Rules
(min_gpa, no_fail, absent, etc.)
       ↓
Classify each student
   pass/fail/no_result
       ↓
Return classified array
       ↓
renderSummary() + renderStudentList()
```

---

### Execute Promote Flow

```
User clicks "Execute Promote"
       ↓
Type-to-Confirm validation
       ↓
Confirm dialog
       ↓
FDCPromoteEngine.executePromote()
       ↓
Step 1: Generate batch_id (UUID)
       ↓
Step 2: Load + Delete target students
   ├── Delete student_subjects
   ├── Delete results
   ├── Delete result_details
   └── Delete students
       ↓
Step 3: Prepare new student records
       ↓
Step 4: Insert to target students table
       ↓
Step 5: Copy subjects (branch-aware)
   ├── HSC: as-is copy
   └── BM: pairing-based swap
       ↓
Step 6: Save audit log
         (promotion_audit)
       ↓
Step 7: Delete source students
       ↓
Step 8: Save promotion log
         (promotion_log)
       ↓
Return result
(promoted_count, batch_id)
```

---

### Subject Pairing Logic

```javascript
const isBM = (student.branch === 'BM');
const isClassChange = (student.class_name !== targetClass);

if (isBM && isClassChange) {
    // BM: swap via paired_with_id
    for (const oldSub of oldSubjects) {
        const pairedId = await getPairedSubjectId(oldSub.subject_id);
        records.push({
            student_id: newStudent.id,
            subject_id: pairedId || oldSub.subject_id,
            subject_type: oldSub.subject_type
        });
    }
} else {
    // HSC: as-is copy
    for (const oldSub of oldSubjects) {
        records.push({
            student_id: newStudent.id,
            subject_id: oldSub.subject_id,
            subject_type: oldSub.subject_type
        });
    }
}
```

---

### Restore Flow

```
User clicks "Restore Batch"
       ↓
Confirm
       ↓
FDCPromoteRestore.restoreBatch(batchId)
       ↓
Step 1: Load batch info
         (promotion_log)
       ↓
Step 2: Load audit details
         (promotion_audit)
       ↓
Step 3: Delete ALL new students
   ├── Delete subjects
   └── Delete students
       ↓
Step 4: Restore ALL old students
         (from JSONB snapshot)
       ↓
Step 5: Restore subjects
         (from JSONB snapshot)
       ↓
Step 6: Update batch status
         → 'rolled_back'
       ↓
Return restored_count
```

---

## 🔌 API Reference

### FDCPromoteUtils

```javascript
FDCPromoteUtils.generateBatchId()
  // Returns: UUID v4

FDCPromoteUtils.getSessionFromYear(year)
  // Input: 2027
  // Returns: "2027-2028"

FDCPromoteUtils.loadPromotionRules()
  // Returns: { min_gpa, no_fail_subjects, ... }

FDCPromoteUtils.detectPassFail(options)
  // Input: { sourceClass, sourceYear, branch, examId }
  // Returns: Array of classified students

FDCPromoteUtils.getPairedSubjectId(subjectId)
  // Returns: paired ID or null

FDCPromoteUtils.getPairedSubjectsBatch(subjectIds)
  // Returns: { oldId: newId, ... }

FDCPromoteUtils.preparePromotedSubjects(oldStu, newStu, targetClass)
  // Returns: Array of subject records

FDCPromoteUtils.formatStats(classified)
  // Returns: { total, passed, failed, absent, noResult }
```

---

### FDCPromoteEngine

```javascript
FDCPromoteEngine.executePromote(options, onProgress)
  // options:
  //   sourceClass, sourceYear, targetClass, targetYear,
  //   sourceBranch, selectedStudents, deleteTarget, adminInfo
  // onProgress: (message, percent) => void
  // Returns: { success, batchId, promotedCount, ... }

FDCPromoteEngine.saveAuditLog(batchId, classified, newStu, options)

FDCPromoteEngine.savePromotionLog(batchId, options)
```

---

### FDCPromoteRestore

```javascript
FDCPromoteRestore.loadBatchHistory(limit)
  // Returns: Array of batches

FDCPromoteRestore.loadBatchDetails(batchId)
  // Returns: Array of audit records

FDCPromoteRestore.restoreBatch(batchId, onProgress)
  // Returns: { success, restoredCount, errors }
```

---

### FDCPromoteRules

```javascript
FDCPromoteRules.loadAllRules()
  // Returns: Array of rules

FDCPromoteRules.updateRule(ruleId, ruleValue)
  // Returns: true/false

FDCPromoteRules.toggleRuleActive(ruleId, isActive)
  // Returns: true/false
```

---

## 🛡️ Security Considerations

### Row Level Security (RLS)

- সব নতুন table-এ RLS enable করতে হবে
- শুধু authenticated admin access
- Service role key শুধু Edge Function-এ

**SQL:**
```sql
ALTER TABLE promotion_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;
```

### Audit Trail

- প্রতিটি promote **permanent record** রাখে
- **JSONB snapshots** — Restore-এর জন্য
- **Batch ID** — traceability
- **performed_by** — who did it

### Type-to-Confirm

- `DELETE {year}` type করা বাধ্যতামূলক
- ভুল accident রোধ করে
- Case-sensitive

---

## 🐛 Known Limitations

### 1. Single Transaction নয়

- সব operation একসাথে rollback হবে না
- **Solution:** Restore feature

### 2. Parallel Execution নেই

- Sequential insert/delete
- **Solution:** Performance acceptable for 100+ students

### 3. No Result Students

- Manual decision লাগে
- **Solution:** Admin override option

### 4. BM Trade Subject Match

- Name-based matching (`normalizeTradeName`)
- Spelling difference সমস্যা হতে পারে
- **Solution:** Manual verification

---

## 🚀 Future Enhancements

- [ ] Email notification on promote
- [ ] Push notification
- [ ] Bulk restore from CSV
- [ ] Promote preview PDF
- [ ] Multi-class promote (11 → 12 → 13)
- [ ] Auto-detect academic year
- [ ] Promote scheduling (cron)

---

## 📚 References

- [PROMOTION_GUIDE.md](./PROMOTION_GUIDE.md) — Admin guide
- [TEST_PLAN.md](./TEST_PLAN.md) — Testing checklist
- Supabase Dashboard: `dpbbsfppjmgvzsopmdww`
- GitHub: `sabbirhosannirob9-oss/fulbariya-college`

---

## 📞 Contact

**Developer:** Sabbir Hosan Nirob
**Email:** sabbirhosannirob9@gmail.com

---

**🏗️ Fulbariya College · Promote System Architecture**