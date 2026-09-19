# 🎓 Promote System — Admin Guide

**Fulbariya College**
**Version:** 1.0

---

## 📌 Promote System কী?

এটি একটি automated system যা **Final পরীক্ষার result** থেকে Pass/Fail detect করে ছাত্র-ছাত্রীদের **পরবর্তী শ্রেণিতে Promote** করে।

- **HSC:** Subjects as-is copy হয় (একই থাকে)
- **BM:** Subjects auto-swap হয় (Class 11 → Class 12)

---

## 🎯 Promote করার আগে যা যা দরকার

### চেকলিস্ট:

- [ ] Final পরীক্ষার **Result Entry** করা হয়েছে
- [ ] Result **Publish** করা হয়েছে (Draft → Published)
- [ ] Student-দের **Subject Assign** করা আছে
- [ ] BM Branch-এ **Subject Pairing Setup** আছে

---

## 📋 Step-by-Step Process

### Step 1 — Dashboard-এ যান

`admin-dashboard.html` → **Management** section → **15. Promote Students** card ক্লিক করুন।

অথবা সরাসরি:
```
admin-promote.html
```

---

### Step 2 — Source Selection

**Source = যেখান থেকে ছাত্ররা আসবে**

| Field | কী দিবেন | উদাহরণ |
|---|---|---|
| Class | যে class থেকে Promote | Class 11 |
| Year | যে year-এর ছাত্ররা | 2026 |
| Branch | শাখা | HSC / BM / All |
| Exam | Fixed "Final পরীক্ষা" | — |

**তারপর:** `[🔍 Load Students]` ক্লিক করুন।

---

### Step 3 — Result Summary দেখুন

```
Total: 60
✅ Passed: 55 → Promote হবে
❌ Failed: 3 → Class 11-এ থাকবে
⚠️ No Result: 2 → Manual decision
```

**👉 Pass করা ছাত্র-ছাত্রীরা auto-checked থাকবে।**

---

### Step 4 — Student List Verify

- ✅ **Pass করা ছাত্র auto-selected**
- ❌ **Fail করা ছাত্র auto-unchecked**

**Admin চাইলে:**
- Pass করা ছাত্রকে uncheck করতে পারবে
- Fail করা ছাত্রকে check করতে পারবে (override)
- No Result ছাত্রকে check করতে পারবে

---

### Step 5 — Target Selection

| Field | কী দিবেন | উদাহরণ |
|---|---|---|
| Class | পরবর্তী class | Class 12 |
| Year | পরবর্তী year | 2027 |
| Session | Auto-fill | 2027-2028 |

**⚠️ সতর্কতা:** Target class-এ বর্তমানে যতজন student আছে — তারা **delete** হবে।

---

### Step 6 — Type-to-Confirm

**নিশ্চিত করার জন্য টাইপ করুন:**

```
DELETE 2027
```

**⚠️ এই code টাইপ না করলে `Execute Promote` বাটন কাজ করবে না।**

---

### Step 7 — Execute Promote

`[🎓 Execute Promote]` ক্লিক করুন।

**চূড়ান্ত নিশ্চিতকরণ আসবে** → **`Yes, Execute`** ক্লিক করুন।

**Progress দেখা যাবে:**
```
🎓 Promote চলছে...
[████████░░] 80%
📚 Subjects copy... (45/55)
```

**সময়:** 55 জন student-এর জন্য ~30 সেকেন্ড।

---

### Step 8 — Success Message

```
✅ 55 জন student সফলভাবে Promote হয়েছে!
```

Dashboard automatically reload হবে।

---

## 🔄 Promote করার পরে কী হয়

| কী | কোথায় যায় |
|---|---|
| Pass করা ছাত্র | Class 11 → Class 12 |
| Failed ছাত্র | Class 11-এ থাকে |
| No Result ছাত্র | Class 11-এ থাকে |
| Target-এর পুরোনো ছাত্র | Permanently delete |
| Subjects (HSC) | As-is copy |
| Subjects (BM) | Auto-swap |

---

## 🎯 Restore করা (ভুল হলে)

### কখন Restore করবেন?

- ভুল class-এ promote হয়েছে
- ভুল year select হয়েছে
- ভুল branch-এ promote হয়েছে
- Admin ভুল student promote করেছে

### কীভাবে Restore করবেন?

1. Dashboard → **16. Promotion History**
2. Batch list-এ সব Promote রেকর্ড
3. যে batch restore করবেন → **View Details**
4. Details verify → **`↺ এই Batch Restore করুন`**
5. Confirm করুন

**⚠️ Restore করার ফলে:**
- নতুন promote করা student-রা delete হবে
- পুরোনো student-রা ফিরে আসবে
- Original state-এ ফিরে যাবে

---

## ⚙️ Promote Settings

**Dashboard → 17. Promotion Settings**

### Rules:

| Rule | Default | কাজ |
|---|---|---|
| **সর্বনিম্ন GPA** | 2.00 | GPA কম হলে Fail |
| **No Fail Subjects** | ✅ ON | কোনো subject fail থাকলে Fail |
| **Absent is Fail** | ✅ ON | কোনো subject absent থাকলে Fail |
| **No Result Action** | Skip | Result না থাকলে promote হবে না |

**⚠️ পরিবর্তন করলে পরবর্তী Promote-এ apply হবে।**

---

## 🚨 সাধারণ সমস্যা ও সমাধান

### সমস্যা ১: "Load Students" চাপলে কিছু আসে না

**কারণ:**
- Final exam-এর result entry হয়নি
- অথবা result publish হয়নি

**সমাধান:**
- admin-results.html-এ result entry করুন
- তারপর Publish করুন

---

### সমস্যা ২: BM-এর subject swap হয় না

**কারণ:**
- Subject Pairing setup করা হয়নি

**সমাধান:**
- Supabase-এ `subjects` table-এ `paired_with_id` verify করুন
- Developer-এর সাথে যোগাযোগ করুন

---

### সমস্যা ৩: Type-to-Confirm কাজ করে না

**কারণ:**
- ভুল code টাইপ করেছেন (Case-sensitive)

**সমাধান:**
- Screen-এ দেখানো code হুবহু টাইপ করুন
- Example: `DELETE 2027`

---

### সমস্যা ৪: Promote Execute কাজ করে না

**কারণ:**
- Target class / year select করা হয়নি
- অথবা কোনো student selected নয়

**সমাধান:**
- Target: Class এবং Year দুটোই select করুন
- কমপক্ষে ১ জন student check করুন

---

## 📊 Promote করার Best Time

| কখন | কাজ |
|---|---|
| **ডিসেম্বর (Year End)** | Class 11 → Class 12 Promote |
| **জানুয়ারি (Year Start)** | নতুন ছাত্র Class 11-এ Bulk Import |

**👉 প্রতি year-এ ২টাই কাজ।**

---

## ✅ Do's and Don'ts

### ✅ যা করবেন:

- Promote করার আগে **Backup** নিন
- ছাত্র-ছাত্রীর **Result verify** করুন
- Type-to-Confirm **ধীরে ধীরে** টাইপ করুন
- Failed ছাত্রদের **Class 11-এ রাখুন**
- Promote-এর পরে **History check** করুন

### ❌ যা করবেন না:

- Result entry না করে Promote করবেন না
- Backup ছাড়া Promote করবেন না
- ভুল year-এ Promote করবেন না
- Type-to-Confirm bypass করার চেষ্টা করবেন না
- Restore করার আগে verify না করে করবেন না

---

## 📞 সাহায্যের জন্য

**সমস্যা হলে:**
- System Admin: সাব্বির হোসেন নীরব
- Email: sabbirhosannirob9@gmail.com

---

## 📝 Notes

- Promote একবার executed হলে **Batch ID** তৈরি হয়
- প্রতিটি Promote **History**-তে saved হয়
- **Restore** করা যাবে (Batch ID দিয়ে)
- **Audit Log** — প্রতিটি student-এর old & new data saved

---

**🎓 Promote System — Fulbariya College**