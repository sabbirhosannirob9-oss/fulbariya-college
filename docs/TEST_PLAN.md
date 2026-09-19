# 🧪 Promote System — Test Plan

**Fulbariya College**
**Version:** 1.0

---

## 📋 Pre-Test Checklist

**Test শুরু করার আগে verify করুন:**

- [ ] সব ১৩টি file GitHub-এ pushed
- [ ] Cloudflare deploy completed
- [ ] Database-এ ৪টি table created:
  - [ ] `promotion_log`
  - [ ] `promotion_audit`
  - [ ] `promotion_rules`
  - [ ] `academic_years`
- [ ] `subjects`-এ `paired_with_id` column added
- [ ] BM-এ ১৩টি pair setup
- [ ] Admin login কাজ করছে
- [ ] Browser Console খোলা (F12)

---

## ✅ Test 1 — File Loading

**Steps:**
1. `admin-dashboard.html` খুলুন
2. F12 → Console

**Expected:**
```
✅ Admin loaded: [name]
✅ Admin Dashboard v2.5 initialized
```

**❌ Fail হলে:**
- Console-এ error দেখুন
- Admin login session issue

---

## ✅ Test 2 — Dashboard Cards

**Steps:**
1. Dashboard → **Management** section scroll
2. নিচের ৩টি card verify করুন

**Expected:**

| Card | Icon Color |
|---|---|
| 15. Promote Students | 🟢 সবুজ |
| 16. Promotion History | 🟡 হলুদ |
| 17. Promotion Settings | 🔵 নীল |

**✅ Pass:** ৩টি card দেখা যায়
**❌ Fail:** Card missing বা layout broken

---

## ✅ Test 3 — Promote Page Load

**Steps:**
1. Dashboard → **Promote Students** card ক্লিক
2. Page load হয়

**URL:**
```
/admin-pages/admin-promote.html
```

**Expected:**
- Header: "🎓 Promote Students"
- Step 1: Source selection
- Step 2-4: Disabled (অপেক্ষা করছে)
- Button: "🔍 Load Students"

**Console:**
```
✅ Promote Utils loaded
✅ Promote Engine loaded
✅ Admin Promote ready
```

---

## ✅ Test 4 — Load Students (Real Data)

**Steps:**
1. Source Class: **11**
2. Source Year: **2026** (যে year-এ result আছে)
3. Source Branch: **HSC**
4. Exam: **Final পরীক্ষা** (fixed)
5. `[🔍 Load Students]` ক্লিক

**Expected:**

**A. যদি Student থাকে:**
- Summary box দেখা যাবে:
  - Total: X
  - Passed: Y
  - Failed: Z
  - No Result: W
- Student list দেখা যাবে
- Pass students auto-checked

**B. যদি Student না থাকে:**
- "কোনো student পাওয়া যায়নি" message

**Console:**
```
✅ Classified students: X
```

**❌ Fail হলে:**
- Empty result → Result entry করা হয়নি
- Error → DB query issue

---

## ✅ Test 5 — Student Checkbox Toggle

**Steps:**
1. Student list-এ কোনো Pass student-এর checkbox uncheck করুন
2. আবার check করুন
3. Fail student-এর checkbox check করুন

**Expected:**
- Checked count update হয়
- Row background পরিবর্তিত হয়:
  - Checked → সবুজ background
  - Unchecked → সাদা

---

## ✅ Test 6 — Select All

**Steps:**
1. **Select All** checkbox-এ ক্লিক

**Expected:**
- সব students checked
- Selected count = Total

**আবার uncheck করলে:**
- সব students unchecked
- Selected count = 0

---

## ✅ Test 7 — Target Selection

**Steps:**
1. Target Class: **12**
2. Target Year: **2027**

**Expected:**
- Session auto-fill: **2027-2028**
- Target info warning দেখা যায়:
  ```
  Class 12 / Year 2027-এ বর্তমানে X জন student আছে।
  ⚠️ Promote চালু করলে এরা delete হবে।
  ```
- Final summary দেখা যায়:
  ```
  📤 Source: Class 11 / Year 2026 / HSC
  📥 Target: Class 12 / Year 2027
  ✅ Promote হবে: X জন
  ```

---

## ✅ Test 8 — Type-to-Confirm

**Steps:**
1. Confirm input-এ ভুল code টাইপ করুন: `WRONG CODE`

**Expected:**
- Button disabled (gray)
- Input-এ red border

**Steps:**
2. সঠিক code টাইপ করুন: `DELETE 2027`

**Expected:**
- Button enabled (green)
- Input-এ green border

---

## ✅ Test 9 — Execute Promote (Critical)

**⚠️ Backup নিন আগে:**

```sql
CREATE TABLE students_backup_test AS 
SELECT * FROM students;

CREATE TABLE student_subjects_backup_test AS 
SELECT * FROM student_subjects;
```

**Steps:**
1. সব field verify করুন
2. `[🎓 Execute Promote]` ক্লিক
3. Confirm dialog → **Yes, Execute**

**Expected:**

**A. Progress Overlay:**
- Progress bar দেখা যায়
- Percentage update হয়
- Message: "📚 Subjects copy... (X/Y)"

**B. Success Message:**
```
✅ X জন student সফলভাবে Promote হয়েছে!
```

**C. Auto Reload:**
- ২ সেকেন্ড পরে page reload

**Console:**
```
📦 Batch তৈরি হচ্ছে...
🗑️ Target-এর পুরোনো data delete করছি...
📝 নতুন student data তৈরি করছি...
✅ নতুন student insert করছি...
📚 Subjects copy করছি...
🗑️ Source থেকে old data delete করছি...
📋 Log save করছি...
```

---

## ✅ Test 10 — Verify Promote (Supabase)

**Supabase SQL Editor-এ:**

### Query 1 — Source খালি হয়েছে?
```sql
SELECT COUNT(*) 
FROM students 
WHERE class_name = '11' 
  AND year = '2026' 
  AND branch = 'HSC' 
  AND is_active = true;
```

**Expected:** `0`

### Query 2 — Target-এ নতুন student?
```sql
SELECT COUNT(*) 
FROM students 
WHERE class_name = '12' 
  AND year = '2027';
```

**Expected:** Promoted count

### Query 3 — HSC Subjects (as-is copy)?
```sql
SELECT 
    s.name,
    sub.subject_name,
    sub.class_name as subject_class
FROM students s
JOIN student_subjects ss ON ss.student_id = s.id
JOIN subjects sub ON sub.id = ss.subject_id
WHERE s.class_name = '12' 
  AND s.year = '2027'
  AND s.branch = 'HSC'
LIMIT 10;
```

**Expected:** Subjects same class-এ

---

## ✅ Test 11 — BM Subject Swap

**⚠️ BM Branch-এর জন্য:**

**Steps:**
1. BM student promote করুন
2. Verify subjects

**Query:**
```sql
SELECT 
    s.name,
    sub.subject_name,
    sub.class_name as subject_class
FROM students s
JOIN student_subjects ss ON ss.student_id = s.id
JOIN subjects sub ON sub.id = ss.subject_id
WHERE s.class_name = '12' 
  AND s.year = '2027'
  AND s.branch = 'BM'
LIMIT 20;
```

**Expected:** Subjects Class 12-এর:
- ❌ বাংলা-১ → ✅ বাংলা-২
- ❌ ইংরেজি-১ → ✅ ইংরেজি-২
- ❌ হিসাববিজ্ঞান-১ → ✅ হিসাববিজ্ঞান-২
- ❌ ডিজিটাল টেকনোলজি-১ → ✅ ডিজিটাল টেকনোলজি-২

**❌ Fail হলে:** Pairing setup করা হয়নি

---

## ✅ Test 12 — Promotion Log

**Query:**
```sql
SELECT 
    batch_id,
    source_class,
    target_class,
    promoted_count,
    failed_count,
    status,
    performed_at
FROM promotion_log
ORDER BY performed_at DESC
LIMIT 5;
```

**Expected:** Recent promotion entry
- `status = 'completed'`
- `promoted_count > 0`

---

## ✅ Test 13 — Audit Log

**Query:**
```sql
SELECT 
    student_name,
    student_roll,
    result_status,
    total_gpa
FROM promotion_audit
WHERE batch_id = '[YOUR_BATCH_ID]'
LIMIT 10;
```

**Expected:** প্রতিটি student-এর snapshot
- `old_student_data` JSONB
- `old_subjects` JSONB

---

## ✅ Test 14 — History Page

**Steps:**
1. Dashboard → **Promotion History** ক্লিক
2. Batch list load হয়

**Expected:**
- Batch list table:
  - Batch ID (short)
  - Source
  - Target
  - Date
  - Promoted count
  - Failed count
  - Actions: View, Restore

---

## ✅ Test 15 — View Details

**Steps:**
1. History → কোনো batch-এ **View** ক্লিক

**Expected:**
- Modal opens
- Summary stats
- Batch ID, Source, Target, Date
- Student details table

---

## ✅ Test 16 — Restore (Critical)

**⚠️ সাবধানতার সাথে:**

**Steps:**
1. History → batch → **Restore** ক্লিক
2. Confirm → **Yes, Restore**
3. Progress দেখা যায়
4. Success: "X জন student ফিরে এসেছে"

**Verify:**
```sql
-- Source-এ ফিরে এসেছে?
SELECT COUNT(*) 
FROM students 
WHERE class_name = '11' 
  AND year = '2026'
  AND branch = 'HSC';
-- Expected: original count

-- Target খালি?
SELECT COUNT(*) 
FROM students 
WHERE class_name = '12' 
  AND year = '2027'
  AND branch = 'HSC'
  AND promoted_in_batch = '[BATCH_ID]';
-- Expected: 0
```

---

## ✅ Test 17 — Settings Page

**Steps:**
1. Dashboard → **Promotion Settings** ক্লিক

**Expected:**
- Min GPA input: `2.00`
- No Fail Subjects toggle: ON
- Absent is Fail toggle: ON
- No Result Action: `Skip`
- Rules Summary দেখা যায়

---

## ✅ Test 18 — Save Settings

**Steps:**
1. Min GPA: `2.00` → `2.50`
2. **Save Settings** ক্লিক
3. Confirm → Yes

**Expected:**
- Success: "1টি rule update হয়েছে"
- Rules summary update

**Verify:**
```sql
SELECT rule_key, rule_value 
FROM promotion_rules 
WHERE rule_key = 'min_gpa';
-- Expected: 2.50
```

---

## ✅ Test 19 — Reset Settings

**Steps:**
1. Min GPA change করুন
2. **Reset** ক্লিক
3. Confirm

**Expected:**
- আগের value ফিরে আসে
- DB save হয় না

---

## 🚨 Error Scenarios

### Error 1: Database Connection Fail

**Symptom:** Console-এ error
**Check:** Supabase config
**Fix:** `config.js` verify

### Error 2: Empty Result Load

**Symptom:** "No student found"
**Check:** Result entry করা হয়েছে কি
**Fix:** admin-results.html-এ result entry

### Error 3: Type-to-Confirm Mismatch

**Symptom:** Button disabled থাকে
**Check:** Case-sensitivity
**Fix:** হুবহু code টাইপ

### Error 4: BM Subjects Not Swapped

**Symptom:** বাংলা-১ → বাংলা-১ (same)
**Check:** `paired_with_id` column
**Fix:** SQL দিয়ে pairing setup

### Error 5: Restore Fail

**Symptom:** কিছু student ফিরে আসে না
**Check:** `promotion_audit` table-এ data
**Fix:** batch_id verify

---

## 📊 Test Summary Checklist

| # | Test | Status |
|---|---|---|
| ১ | File Loading | ⬜ |
| ২ | Dashboard Cards | ⬜ |
| ৩ | Promote Page Load | ⬜ |
| ৪ | Load Students | ⬜ |
| ৫ | Checkbox Toggle | ⬜ |
| ৬ | Select All | ⬜ |
| ৭ | Target Selection | ⬜ |
| ৮ | Type-to-Confirm | ⬜ |
| ৯ | Execute Promote | ⬜ |
| ১০ | Verify Promote (SQL) | ⬜ |
| ১১ | BM Subject Swap | ⬜ |
| ১২ | Promotion Log | ⬜ |
| ১৩ | Audit Log | ⬜ |
| ১৪ | History Page | ⬜ |
| ১৫ | View Details | ⬜ |
| ১৬ | Restore | ⬜ |
| ১৭ | Settings Page | ⬜ |
| ১৮ | Save Settings | ⬜ |
| ১৯ | Reset Settings | ⬜ |

**সব ✅ হলে:** System production-ready 🎉

---

## 🔄 Post-Test Cleanup

**Test data delete করুন:**

```sql
-- Test promotions delete
DELETE FROM promotion_audit WHERE batch_id IN (
    SELECT batch_id FROM promotion_log 
    WHERE performed_by_name = 'Test'
);

DELETE FROM promotion_log WHERE performed_by_name = 'Test';

-- Test backup tables delete
DROP TABLE IF EXISTS students_backup_test;
DROP TABLE IF EXISTS student_subjects_backup_test;
```

---

## 📞 সমস্যা হলে

1. **Console Error** → Screenshot নিন
2. **Supabase Logs** → Edge Function logs
3. **Contact** → sabbirhosannirob9@gmail.com

---

**🧪 Fulbariya College · Promote System Test Plan**