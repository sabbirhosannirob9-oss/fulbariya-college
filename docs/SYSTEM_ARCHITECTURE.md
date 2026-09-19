# 🏗️ Fulbariya College — System Architecture

**Version:** 2.0
**Last Updated:** Session Copy Fix (Academic Session Policy)
**Target Audience:** Developer, Maintainer

---

## 📖 Table of Contents

1. [Overview](#1-overview)
2. [Tech Stack](#2-tech-stack)
3. [File Structure](#3-file-structure)
4. [Database Schema](#4-database-schema)
5. [Session Policy (Code Level)](#5-session-policy-code-level)
6. [Promote Engine Flow](#6-promote-engine-flow)
7. [Subject Pairing Logic](#7-subject-pairing-logic)
8. [Audit Log System](#8-audit-log-system)
9. [Data Flow Diagrams](#9-data-flow-diagrams)
10. [Helper Functions Reference](#10-helper-functions-reference)
11. [Error Handling](#11-error-handling)
12. [Testing Checklist](#12-testing-checklist)

---

## 1. Overview

Fulbariya College-এর জন্য একটি **free, dynamic website** — যার মধ্যে একটি automated **Student Promote System** আছে।

### 🎯 Core Principles

- **Academic Session = Admission Year** (never changes)
- **Pass/Fail auto-detection** from Final exam result
- **Full audit trail** for every promotion
- **Restorable** (rollback support)
- **Zero cost** infrastructure

### 📦 Scope

**In scope:**
- Class 11 → 12 promotion
- Internal exams (1st/2nd Terminal, Test, Final)
- Academic session tracking
- Subject pairing (BM branch)

**Out of scope:**
- HSC Board exam
- Retake / Improvement exam
- Fee management
- Attendance

---

## 2. Tech Stack

| Service | Purpose | Cost |
|---------|---------|------|
| **GitHub** | Code hosting | $0 |
| **Cloudflare Pages** | Site hosting | $0 |
| **Supabase** | Database + Auth + Edge Functions | $0 |
| **Cloudinary** | Image hosting | $0 |
| **Total** | | **$0 forever** |

### 🔑 Important Keys

```
Live URL:        https://fulbariya-college.pages.dev
GitHub:          github.com/sabbirhosannirob9-oss/fulbariya-college
Supabase URL:    dpbbsfppjmgvzsopmdww.supabase.co
Supabase Key:    sb_publishable_O0gApiitS1P9graqe1cjKA_f8KJRUD5
Cloudinary:      awxusvtg / preset: college_unsigned
```

---

## 3. File Structure

```
FULBARIYA COLLEGE/
│
├── admin-pages/
│   ├── admin-promote.html              ← Main promote page
│   ├── admin-promote-history.html      ← History/restore page
│   ├── admin-promote-settings.html     ← Rules editor
│   ├── admin-students.html             ← Students CRUD
│   └── ... (other admin pages)
│
├── css/
│   ├── admin.css
│   ├── student.css
│   └── ...
│
├── docs/
│   ├── PROMOTION_GUIDE.md              ← Admin manual (Bengali)
│   └── SYSTEM_ARCHITECTURE.md          ← This file
│
├── js/
│   ├── promote-utils.js                ← Helpers, pass/fail
│   ├── promote-engine.js               ← Execute promote
│   ├── promote-restore.js              ← Rollback
│   ├── promote-rules.js                ← Rules CRUD
│   ├── admin-promote.js                ← Promote UI
│   ├── admin-promote-history.js        ← History UI
│   ├── admin-promote-settings.js       ← Settings UI
│   ├── admin-students.js               ← Students UI
│   └── ... (other js)
│
├── public-pages/
│   └── ...
│
├── index.html
├── manifest.json
└── service-worker.js
```

---

## 4. Database Schema

### 👤 Student Table

```sql
CREATE TABLE students (
    id              BIGSERIAL PRIMARY KEY,
    name            TEXT NOT NULL,
    roll            TEXT NOT NULL,
    
    -- Academic
    class_name      TEXT NOT NULL,          -- "11" or "12"
    year            TEXT NOT NULL,          -- "2024", "2025"
    session         TEXT NOT NULL,          -- "2024-25" ← NEVER CHANGES
    branch          TEXT NOT NULL,          -- "HSC" or "BM"
    group_name      TEXT,                   -- "Science", "BM-General"
    
    -- Tracking
    is_active       BOOLEAN DEFAULT TRUE,
    promoted_in_batch TEXT,                 -- FK to promotion_log.batch_id
    previous_batch  TEXT,                   -- Previous promotion batch
    promoted_at     TIMESTAMP,
    
    -- Metadata
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);
```

### 📋 promotion_log Table

Stores each batch record.

```sql
CREATE TABLE promotion_log (
    id                  BIGSERIAL PRIMARY KEY,
    batch_id            TEXT UNIQUE NOT NULL,   -- UUID
    performed_by        BIGINT,                 -- FK admins.id
    performed_by_name   TEXT,
    
    -- Source
    source_class        TEXT NOT NULL,
    source_year         TEXT NOT NULL,
    source_branch       TEXT NOT NULL,
    
    -- Target
    target_class        TEXT NOT NULL,
    target_year         TEXT NOT NULL,
    target_session      TEXT NOT NULL,          -- ← source session (copy)
    target_branch       TEXT,
    
    -- Stats
    total_students      INT DEFAULT 0,
    promoted_count      INT DEFAULT 0,
    failed_count        INT DEFAULT 0,
    absent_count        INT DEFAULT 0,
    no_result_count     INT DEFAULT 0,
    target_deleted_count INT DEFAULT 0,
    
    -- Status
    status              TEXT DEFAULT 'completed',  -- completed | failed | rolled_back
    error_message       TEXT,
    notes               TEXT,
    
    performed_at        TIMESTAMP DEFAULT NOW()
);
```

### 🔍 promotion_audit Table

Per-student snapshot (for rollback).

```sql
CREATE TABLE promotion_audit (
    id                  BIGSERIAL PRIMARY KEY,
    batch_id            TEXT NOT NULL,          -- FK promotion_log.batch_id
    
    -- Old student snapshot
    student_id          BIGINT,                 -- Old ID
    student_name        TEXT,
    student_roll        TEXT,
    old_student_data    JSONB,                  -- Full snapshot
    old_subjects        JSONB,                  -- Subject snapshot
    old_result_data     JSONB,                  -- Result snapshot
    
    -- New student reference
    new_student_id      BIGINT,
    new_student_data    JSONB,
    new_subjects        JSONB,
    
    -- Result info
    result_status       TEXT,                   -- pass | fail | no_result
    total_gpa           DECIMAL(4,2),
    total_marks         INT,
    action_type         TEXT DEFAULT 'promoted',
    
    created_at          TIMESTAMP DEFAULT NOW()
);
```

### ⚙️ promotion_rules Table

Configurable pass/fail rules.

```sql
CREATE TABLE promotion_rules (
    id              BIGSERIAL PRIMARY KEY,
    rule_key        TEXT UNIQUE NOT NULL,
    rule_value      TEXT NOT NULL,
    description     TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- Default rules:
INSERT INTO promotion_rules (rule_key, rule_value, description) VALUES
    ('min_gpa',           '2.00',  'Minimum GPA to pass'),
    ('no_fail_subjects',  'true',  'No subject can be failed'),
    ('absent_is_fail',    'true',  'Absent counts as fail'),
    ('no_result_action',  'skip',  'What to do if no result'),
    ('optional_bonus',    'true',  'Optional subject counts to GPA');
```

### 📅 academic_years Table

Session management (optional, for future).

```sql
CREATE TABLE academic_years (
    id              BIGSERIAL PRIMARY KEY,
    session         TEXT UNIQUE NOT NULL,       -- "2024-25"
    start_year      INT NOT NULL,               -- 2024
    end_year        INT NOT NULL,               -- 2025
    is_current      BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT NOW()
);
```

### 📚 Supporting Tables

- `subjects` — subject definitions with `paired_with_id`
- `student_subjects` — student-subject mapping
- `results` — exam results (with `is_published` flag)
- `result_details` — per-subject marks
- `exams` — exam definitions (1st Terminal, 2nd Terminal, Test, Final)
- `admins` — admin users

---

## 5. Session Policy (Code Level)

### 🔑 Core Rule

```
Session = Admission Year (ভর্তির বছর)
NEVER changes throughout student life.
```

### 🎯 Helper Function — `getStudentSession()`

**Location:** `js/promote-utils.js`

```javascript
function getStudentSession(student) {
    if (!student) return '';

    // Priority 1: explicit session field
    if (student.session && String(student.session).trim() !== '') {
        return String(student.session).trim();
    }

    // Priority 2: fallback from year
    if (student.year) {
        return getSessionFromYear(student.year);
    }

    return '';
}

function getSessionFromYear(year) {
    if (!year) return '';
    const y = parseInt(year);
    if (isNaN(y)) return '';
    return y + '-' + (y + 1);
}
```

### 🏗️ Record Builder — `buildPromotedStudentRecord()`

**Location:** `js/promote-utils.js`

```javascript
function buildPromotedStudentRecord(sourceStudent, targetClass, targetYear, batchId) {
    if (!sourceStudent) throw new Error('Source student is required');

    const session = getStudentSession(sourceStudent);

    return {
        name: sourceStudent.name,
        roll: sourceStudent.roll,
        class_name: targetClass,
        year: targetYear,
        session: session,           // ✅ COPIED from source
        branch: sourceStudent.branch,
        group_name: sourceStudent.group_name,
        is_active: true,
        promoted_in_batch: batchId,
        previous_batch: sourceStudent.promoted_in_batch || null,
        promoted_at: new Date().toISOString()
    };
}
```

### ❌ Anti-Pattern (what NOT to do)

```javascript
// ❌ NEVER do this
const session = getSessionFromYear(targetYear);
// This generates session from target year → WRONG

// ❌ NEVER do this
session: getSessionFromYear(targetYear)

// ✅ ALWAYS do this
session: getStudentSession(sourceStudent)
```

---

## 6. Promote Engine Flow

### 🎯 Main Entry — `executePromote()`

**Location:** `js/promote-engine.js`

```javascript
async function executePromote(options, onProgress) {
    const {
        sourceClass, sourceYear, targetClass, targetYear,
        sourceBranch, selectedStudents, deleteTarget, adminInfo
    } = options;

    const batchId = window.FDCPromoteUtils.generateBatchId();
    
    // 🎯 Session from SOURCE (not target year)
    const referenceSession = selectedStudents.length > 0
        ? window.FDCPromoteUtils.getStudentSession(selectedStudents[0].student)
        : '';
    
    // ... 7 steps below
}
```

### 📋 7-Step Execution

#### Step 1: Snapshot Target (if deleteTarget)

```javascript
const { data: targets } = await window.FDC_SUPABASE
    .from('students')
    .select('*')
    .eq('class_name', targetClass)
    .eq('year', targetYear)
    .eq('is_active', true);
```

#### Step 2: Delete Target

```javascript
// 2a. Delete student_subjects
// 2b. Delete result_details + results
// 2c. Delete students
```

#### Step 3: Prepare Records (Session Fix Here!)

```javascript
const newStudentRecords = studentsToPromote.map(c => {
    return window.FDCPromoteUtils.buildPromotedStudentRecord(
        c.student,      // source
        targetClass,
        targetYear,
        batchId
    );
    // Session is copied from source inside this helper
});
```

#### Step 4: Insert New Students

```javascript
const { data: inserted } = await window.FDC_SUPABASE
    .from('students')
    .insert(newStudentRecords)
    .select();
```

#### Step 5: Copy Subjects

```javascript
for (const orig of studentsToPromote) {
    const subjectRecords = await window.FDCPromoteUtils.preparePromotedSubjects(
        orig.student, newStu, targetClass
    );
    await window.FDC_SUPABASE.from('student_subjects').insert(subjectRecords);
    
    await saveAuditLog(batchId, orig, newStu, options);
}
```

#### Step 6: Delete Source Students

```javascript
// Delete subjects + results + students
```

#### Step 7: Save Promotion Log

```javascript
await savePromotionLog(batchId, {
    ...options,
    target_session: referenceSession,  // 🎯 Source session
    ...stats
});
```

---

## 7. Subject Pairing Logic

### 🎯 Purpose

BM branch-এ subject **swap** হয় Class change-এ।

### 📋 Flow

```javascript
async function preparePromotedSubjects(oldStudent, newStudent, targetClass) {
    const oldSubs = await loadStudentSubjects(oldStudent.id);

    const isHSC = (oldStudent.branch === 'HSC');
    const isBM = (oldStudent.branch === 'BM');
    const isClassChange = (oldStudent.class_name !== targetClass);

    if (isHSC || !isClassChange) {
        // As-is copy
        return oldSubs.map(os => ({
            student_id: newStudent.id,
            subject_id: os.subject_id,
            subject_type: os.subject_type,
            is_active: true
        }));
    }

    if (isBM && isClassChange) {
        // Pair-swap
        const pairedMap = await getPairedSubjectsBatch(oldSubs.map(s => s.subject_id));
        
        return oldSubs.map(os => ({
            student_id: newStudent.id,
            subject_id: pairedMap[os.subject_id] || os.subject_id,
            subject_type: os.subject_type,
            is_active: true
        }));
    }
}
```

### 🔗 Pair Setup

**Database:**
```sql
-- subjects table
id  | subject_name       | paired_with_id
----|--------------------|---------------
101 | বাংলা-১ম পত্র      | 102
102 | বাংলা-২য় পত্র      | 101
```

**Admin → Subjects** page-এ set করা যায়।

---

## 8. Audit Log System

### 🎯 Purpose

- Rollback support
- Historical record
- Data recovery

### 📋 saveAuditLog()

```javascript
async function saveAuditLog(batchId, classifiedStudent, newStudent, options) {
    const oldStu = classifiedStudent.student;
    
    // Session verify
    const oldSession = window.FDCPromoteUtils.getStudentSession(oldStu);
    const newSession = window.FDCPromoteUtils.getStudentSession(newStudent);
    
    if (oldSession !== newSession) {
        console.warn(`⚠️ Session mismatch: ${oldSession} → ${newSession}`);
    }
    
    await window.FDC_SUPABASE.from('promotion_audit').insert({
        batch_id: batchId,
        student_id: oldStu.id,
        student_name: oldStu.name,
        student_roll: oldStu.roll,
        old_student_data: oldStu,               // Full JSON snapshot
        old_subjects: oldSubs,
        old_result_data: classifiedStudent.result,
        new_student_id: newStudent.id,
        new_student_data: newStudent,
        new_subjects: newSubs,
        result_status: classifiedStudent.status,
        total_gpa: classifiedStudent.gpa,
        action_type: 'promoted'
    });
}
```

### 🔄 restoreBatch()

```javascript
async function restoreBatch(batchId, onProgress) {
    // 1. Load batch info
    // 2. Load audit details
    // 3. Delete new students
    // 4. Restore old students from snapshot
    // 5. Update batch status to 'rolled_back'
}
```

**Rollback Flow:**
```
DELETE FROM students WHERE id IN (new_student_ids)
    ↓
INSERT INTO students (old_student_data)
    ↓
INSERT INTO student_subjects (old_subjects)
    ↓
UPDATE promotion_log SET status = 'rolled_back'
```

---

## 9. Data Flow Diagrams

### 🎯 Full Promote Cycle

```
┌──────────────────────────────────────────────────────────┐
│  ADMIN                                                   │
│  - Source select: Class 11 / 2024 / HSC                 │
│  - [Load Students]                                       │
└────────────────────┬─────────────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────────────┐
│  detectPassFail()                                        │
│  - Load students from DB                                 │
│  - Load results (is_published = true)                    │
│  - Load result_details                                   │
│  - Classify: pass / fail / no_result                     │
└────────────────────┬─────────────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────────────┐
│  PREVIEW (UI)                                            │
│  - Pass students auto-checked                            │
│  - Session shown (2024-25)                               │
│  - Target select: Class 12 / 2025                        │
│  - Session preview: 2024-25 (source copy)                │
└────────────────────┬─────────────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────────────┐
│  executePromote()                                        │
│  ┌────────────────────────────────────────────────────┐  │
│  │  1. Snapshot target students                       │  │
│  │  2. Delete target (if deleteTarget)                │  │
│  │  3. Build records (SESSION COPY from source)       │  │
│  │  4. Insert new students                            │  │
│  │  5. Copy subjects (branch-aware)                   │  │
│  │  6. Delete source students                         │  │
│  │  7. Save promotion_log                             │  │
│  └────────────────────────────────────────────────────┘  │
└────────────────────┬─────────────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────────────┐
│  DATABASE                                                │
│  - students (new records, session preserved)             │
│  - student_subjects (copied)                             │
│  - promotion_log (batch record)                          │
│  - promotion_audit (snapshot for rollback)               │
└──────────────────────────────────────────────────────────┘
```

### 🔄 Restore Flow

```
┌──────────────────────────────────────────────────────────┐
│  ADMIN → Promotion History → [Restore]                   │
└────────────────────┬─────────────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────────────┐
│  restoreBatch(batchId)                                   │
│  1. Load batch info (check status != rolled_back)        │
│  2. Load audits from promotion_audit                     │
│  3. Delete new_student_ids                               │
│  4. Re-insert from old_student_data JSONB                │
│  5. Restore old_subjects                                 │
│  6. Update batch status: 'rolled_back'                   │
└──────────────────────────────────────────────────────────┘
```

---

## 10. Helper Functions Reference

### 📦 promote-utils.js

| Function | Purpose |
|----------|---------|
| `getSessionFromYear(year)` | Year → session string (`2024` → `2024-25`) |
| `getStudentSession(student)` | 🎯 Extract session (with fallback) |
| `isSameSession(a, b)` | Compare two students' sessions |
| `generateBatchId()` | UUID v4 |
| `loadPromotionRules()` | Load active rules from DB |
| `detectPassFail(options)` | Classify students |
| `getPairedSubjectId(id)` | Get single paired subject |
| `getPairedSubjectsBatch(ids)` | Batch fetch pairings |
| `preparePromotedSubjects(old, new, class)` | Build subject copy records |
| `buildPromotedStudentRecord(source, cls, yr, batch)` | 🎯 Build new student record |
| `formatStats(classified)` | Aggregate stats |

### 📦 promote-engine.js

| Function | Purpose |
|----------|---------|
| `executePromote(options, onProgress)` | Main execution |
| `saveAuditLog(batchId, c, newStu, options)` | Per-student audit |
| `savePromotionLog(batchId, options)` | Batch log |

### 📦 promote-restore.js

| Function | Purpose |
|----------|---------|
| `loadBatchHistory(limit)` | List recent batches |
| `loadBatchDetails(batchId)` | Per-student audit for a batch |
| `restoreBatch(batchId, onProgress)` | Rollback |

### 📦 promote-rules.js

| Function | Purpose |
|----------|---------|
| `loadAllRules()` | All rules (active + inactive) |
| `updateRule(id, value)` | Update a rule |
| `toggleRuleActive(id, isActive)` | Enable/disable |

---

## 11. Error Handling

### 🎯 Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Session mismatch` | Target year used for session | Use `getStudentSession(source)` |
| `Duplicate key` | Student already exists | Filter duplicates |
| `No result found` | Result not published | Publish first |
| `No students in source` | Empty filter | Verify source select |
| `Target delete failed` | FK constraints | Check FK order |

### 📋 Logging Strategy

```javascript
// Info
console.log('✅ Session preserved for [name]: 2024-25');

// Warning
console.warn('⚠️ Session mismatch: 2024-25 → 2025-26');

// Error
console.error('❌ Execute error:', e);
```

### 🛡️ Safety Layers

1. **Type-to-Confirm** — `DELETE 2025` টাইপ করতে হবে
2. **Audit snapshot** — সব data JSONB-তে সংরক্ষিত
3. **Restore option** — 1-click rollback
4. **Session verification** — auto-detect mismatch

---

## 12. Testing Checklist

### ✅ Pre-Deploy Test

- [ ] `getStudentSession()` returns correct value
- [ ] `buildPromotedStudentRecord()` copies session
- [ ] Pass students auto-check
- [ ] Fail students remain unchecked
- [ ] Target session preview shows source session
- [ ] Confirmation dialog shows session

### ✅ Promote Test

- [ ] Source load works
- [ ] Preview table renders
- [ ] Target select works
- [ ] Session preview correct
- [ ] Type-to-confirm blocks wrong input
- [ ] Execute completes

### ✅ Post-Promote Verify

- [ ] New students in Class 12 / target year
- [ ] Session = source session (2024-25)
- [ ] Old students deleted from target
- [ ] Failed students stay in Class 11
- [ ] Subjects copied correctly
- [ ] BM subjects swapped (if BM)
- [ ] promotion_log has entry
- [ ] promotion_audit has snapshots

### ✅ Copy/Move Test

- [ ] Copy Year — session preserved
- [ ] Move Year — session preserved
- [ ] Move & Replace — session preserved
- [ ] Source preserved (Copy)
- [ ] Source deleted (Move)
- [ ] Target replaced (Replace)

### ✅ Edit Test

- [ ] Edit mode — session loaded correctly
- [ ] Year change — session NOT auto-overridden
- [ ] Save — session saved correctly

### ✅ Restore Test

- [ ] History page loads
- [ ] Restore button works
- [ ] New students deleted
- [ ] Old students restored
- [ ] Batch status: `rolled_back`
- [ ] Second restore blocked

### ✅ Session Preservation Test

- [ ] Class 11 (2024-25) → Class 12 (2024-25)
- [ ] Copy Year — session same
- [ ] Move Year — session same
- [ ] Edit — session not overridden
- [ ] Console log: `✅ Session preserved`

---

## 📞 Support

**Issues:** GitHub Issues or contact developer.

**Documentation Updates:** PR welcome.

---

**Last Updated:** Session Fix v2.0
**Maintainer:** sabbirhosannirob9-oss