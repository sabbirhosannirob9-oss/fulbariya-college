# 🎓 Fulbariya College — Promotion Guide (Admin Manual)

**Version:** 2.0
**Last Updated:** Session Fix (Academic Session Policy)
**Target Audience:** College Admin, Office Staff

---

## 📖 সূচিপত্র

1. [Promote System কী?](#১-promote-system-কী)
2. [Session Policy — সবচেয়ে গুরুত্বপূর্ণ](#২-session-policy--সবচেয়ে-গুরুত্বপূর্ণ)
3. [Promote করার সম্পূর্ণ Workflow](#৩-promote-করার-সম্পূর্ণ-workflow)
4. [Pass/Fail Rules](#৪-passfail-rules)
5. [Copy Year vs Move Year vs Move & Replace](#৫-copy-year-vs-move-year-vs-move--replace)
6. [Restore (Undo) System](#৬-restore-undo-system)
7. [Subject Pairing (BM Branch)](#৭-subject-pairing-bm-branch)
8. [Troubleshooting](#৮-troubleshooting)
9. [FAQ](#৯-faq)

---

## ১. Promote System কী?

**Promote System** = Class 11-এর student-দের **Final Exam-এর result** দেখে স্বয়ংক্রিয়ভাবে **Class 12-এ উত্তীর্ণ** করা।

### 🎯 মূল লক্ষ্য

```
Class 11 (একademic session: 2024-25)
    ↓ Final Exam Pass হলে
Class 12 (একademic session: 2024-25) ← একই session
```

### ✨ সুবিধা

- ✅ Manual student entry লাগে না
- ✅ Subject auto-copy হয়
- ✅ Pass/Fail auto-detect হয়
- ✅ Full audit trail থাকে
- ✅ Restore (undo) করা যায়

---

## ২. Session Policy — সবচেয়ে গুরুত্বপূর্ণ

### 🔴 বাংলাদেশ HSC-তে Session কী?

**Session = ভর্তির বছর (Academic Session)**

| বিষয় | ব্যাখ্যা |
|------|---------|
| **Session কী?** | Class 11-এ ভর্তি হওয়ার বছর |
| **Format** | `2024-25` (যেমন) |
| **কখন বদলায়?** | কখনো না — ভর্তি থেকে পাস পর্যন্ত একই |
| **কেন?** | বাংলাদেশে session মানে "ব্যাচ" |

### ✅ সঠিক Behavior

```
Class 11 ভর্তি: 2024 (Session: 2024-25)
    ↓ Class 11 Final Pass
Class 12-এ Promote
    ↓
Class 12-এ থাকবে: Session 2024-25 ← একই session
```

### ❌ ভুল Behavior (যা ঠিক করা হয়েছে)

```
Class 11 (2024-25)
    ↓ Promote
Class 12 (2025-26) ← ❌ ভুল! session বদলে গেছে
```

**কারণ:** আগে session target year থেকে generate হতো।

### 🎯 আমাদের website-এর scope

**যা আমরা track করি:**
- ✅ Class 11 ভর্তি
- ✅ ১ম সাময়িক, ২য় সাময়িক, টেস্ট
- ✅ Class 11 Final (Promotion base)
- ✅ Class 12-এ Promote

**যা আমরা track করি না:**
- ❌ HSC Board exam (বোর্ডের কাজ)
- ❌ Board exam-এ fail হলে retake
- ❌ Improvement exam

**মানে:** আপনার website শুধু **Inter-mediate Level** পর্যন্ত। Board-level সব কিছু বাদ।

---

## ৩. Promote করার সম্পূর্ণ Workflow

### 🎬 সম্পূর্ণ Cycle (৪ ধাপ)

### 📌 ধাপ ১: Final Exam Result Entry

```
Admin → Results
  ↓
Exam: Class 11 Final
Class: 11
Year: 2024
Branch: HSC
  ↓
[Load Students]
  ↓
প্রতিটা student-এর marks দিন:
  • CQ (সৃজনশীল)
  • MCQ (নৈর্ব্যক্তিক)
  • Practical (প্রযোজ্য হলে)
  ↓
[Publish] ← ⚠️ অবশ্যই publish করতে হবে
```

**⚠️ গুরুত্বপূর্ণ:**
- Result **publish না করলে** Promote System result দেখবে না
- সব student-এর result entry থাকতে হবে
- `is_published = true` হতে হবে

---

### 📌 ধাপ ২: Promote Page-এ যান

```
Admin Dashboard → 15. Promote Students
```

অথবা সরাসরি: `admin-pages/admin-promote.html`

---

### 📌 ধাপ ৩: Source Select করুন

```
┌─────────────────────────────────────┐
│ 📤 Source (কোথা থেকে)               │
├─────────────────────────────────────┤
│ Class:   [11 ▼]                     │
│ Year:    [2024 ▼]                   │
│ Branch:  [HSC ▼]                    │
│                                     │
│ [Load Students]                     │
└─────────────────────────────────────┘
```

**Load করলে যা দেখবেন:**

```
┌─────────────────────────────────────┐
│ 📊 Summary                          │
│ Total: 50  Pass: 45  Fail: 5        │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ ✅ Student List (50)                │
├─────────────────────────────────────┤
│ ☑ 101 Sabbir                        │
│     HSC · Science · Session: 2024-25│
│     GPA: 4.50   ✅ Pass             │
│                                     │
│ ☐ 102 Rahim                         │
│     HSC · Science · Session: 2024-25│
│     GPA: 1.80   ❌ Fail             │
│                                     │
│ ☑ 103 Karim                         │
│     HSC · Science · Session: 2024-25│
│     GPA: 3.75   ✅ Pass             │
└─────────────────────────────────────┘
```

**🎯 যা দেখবেন:**
- Pass students **auto-checked** ✅
- Fail students **unchecked** ❌
- প্রতিটা student-এর **Session** দেখাবে

---

### 📌 ধাপ ৪: Target Select করুন

```
┌─────────────────────────────────────┐
│ 📥 Target (কোথায় যাবে)             │
├─────────────────────────────────────┤
│ Class:   [12 ▼]                     │
│ Year:    [2025 ▼]                   │
│                                     │
│ 🎓 Session থাকবে: 2024-25 ← ✅       │
└─────────────────────────────────────┘
```

**⚠️ Session note:**
- Session **source থেকে copy** হবে
- Target year থেকে generate হবে না
- Preview-তে দেখাবে: `🎓 Session থাকবে: 2024-25`

**Target-এ student থাকলে warning:**
```
⚠️ Class 12 / Year 2025-এ বর্তমানে 30 জন student আছে।
⚠️ Promote চালু করলে এরা delete হবে।
🎓 Session থাকবে: 2024-25
```

---

### 📌 ধাপ ৫: Final Summary Verify

```
┌─────────────────────────────────────┐
│ 📋 Final Summary                    │
├─────────────────────────────────────┤
│ 📤 Source:  Class 11 / 2024 / HSC   │
│ 📥 Target:  Class 12 / 2025         │
│ 🎓 Session: 2024-25 (source থেকে)   │
│ ✅ Promote হবে:  45 জন              │
│ ⏭️ Class 11-এ থাকবে: 5 জন          │
└─────────────────────────────────────┘
```

---

### 📌 ধাপ ৬: Execute Promote

**Confirmation Input:**

```
⚠️ চূড়ান্ত নিশ্চিতকরণ

• 45 জন student Class 12-এ যাবে
• Session থাকবে: 2024-25 (অপরিবর্তিত)
• Class 12 / Year 2025-এর পুরোনো সব delete হবে
• Class 11-এ 5 জন থাকবে

এটি undo করা যাবে না (তবে Restore করা যাবে)।

Type: DELETE 2025  ← টাইপ করুন

[Cancel]  [Yes, Execute]
```

**Type-to-Confirm:** শুধু `DELETE 2025` টাইপ করলেই button enable হবে।

**Execute চাপলে:**

```
📦 Batch তৈরি হচ্ছে...        [=====     ] 5%
🗑️ Target-এর পুরোনো delete... [====      ] 20%
📝 নতুন student data তৈরি...  [======    ] 30%
✅ নতুন student insert...     [========  ] 40%
📚 Subjects copy...           [========= ] 55%
🗑️ Source delete...           [==========] 88%
📋 Log save...                [==========] 95%
✅ সম্পূর্ণ!                  [==========] 100%
```

---

### 📌 ধাপ ৭: Verify করুন

**Admin → Students-এ যান:**

```
Filter: Class 12 / Year 2025
```

**যা দেখবেন:**

| Roll | Name | Class | Year | Session | Branch |
|------|------|-------|------|---------|--------|
| 101 | Sabbir | 12 | 2025 | **2024-25** ✅ | HSC |
| 103 | Karim | 12 | 2025 | **2024-25** ✅ | HSC |

**🎯 Session কখনো বদলায়নি** — এটাই সঠিক।

**এবং Class 11-এ:**

```
Filter: Class 11 / Year 2024
```

| Roll | Name | Session | Status |
|------|------|---------|--------|
| 102 | Rahim | 2024-25 | ❌ Fail (Class 11-এ থাকবে) |

---

## ৪. Pass/Fail Rules

### ✅ Pass Criteria (তিনটাই পূরণ হতে হবে)

| # | শর্ত |
|---|------|
| ১ | **সব subject-এ pass** — কোনো fail নেই |
| ২ | **কোনো subject-এ absent নেই** |
| ৩ | **GPA ≥ 2.00** |

### ❌ Fail Criteria (যেকোনো একটা হলেই)

| # | শর্ত |
|---|------|
| ১ | কোনো subject-এ **fail** আছে |
| ২ | কোনো subject-এ **absent** আছে |
| ৩ | **GPA < 2.00** |

### ⚠️ No Result

- Result entry **নেই** → auto-check হবে না
- Admin manually decide করবে
- Manual override-এ check করলে promote হবে

### 🔧 Rules পরিবর্তন

```
Admin → 17. Promotion Settings
```

**Rules:**

| Rule | Default | ব্যাখ্যা |
|------|---------|---------|
| Minimum GPA | 2.00 | এর নিচে fail |
| No Fail Subjects | true | একটাও fail থাকলে fail |
| Absent is Fail | true | absent থাকলে fail |

---

## ৫. Copy Year vs Move Year vs Move & Replace

### 📊 পার্থক্য

| Mode | Source-এ | Target-এ | Session |
|------|----------|----------|---------|
| **Copy** | থাকে | নতুন যোগ | same |
| **Move** | delete | নতুন যোগ | same |
| **Replace** | delete | পুরোনো delete, নতুন যোগ | same |

### 🔍 কখন কোনটা?

#### 🅰️ Copy Year
**ব্যবহার:**
- Backup রাখতে চাইলে
- Test করতে চাইলে
- Same student দুই জায়গায় রাখতে হলে

**উদাহরণ:**
```
Class 11 (2024) → Copy → Class 11 (2025)
Source: 50 জন (থাকে)
Target: 50 জন (নতুন copy)
```

#### 🅱️ Move Year
**ব্যবহার:**
- Class promote না করে year update করতে
- Session maintain রেখে year পরিবর্তন

**উদাহরণ:**
```
Class 11 (2024) → Move → Class 11 (2025)
Source: delete (50 জন)
Target: 50 জন (session: 2024-25 same)
```

#### 🅾️ Move & Replace
**ব্যবহার:**
- Target-এ already student থাকলে তাদের replace
- Promote-এর মতো কাজ

**উদাহরণ:**
```
Class 11 (2024) → Replace → Class 12 (2025)
Target-এ 30 জন ছিল → delete
Source থেকে 50 জন → move
Result: Class 12 (2025)-এ 50 জন
```

### ⚠️ Session Behavior (সব mode-এ)

```
সব mode-এ session source থেকে copy হবে
→ Target year থেকে generate হবে না
```

**Info box-এ দেখাবে:**
```
🎓 Session থাকবে: 2024-25
```

---

## ৬. Restore (Undo) System

### 🎯 কখন ব্যবহার করবেন?

- ❌ ভুল student promote হয়ে গেলে
- ❌ ভুল year select করলে
- ❌ Bulk mistake হলে

### 📖 কীভাবে Restore করবেন?

```
Admin → 16. Promotion History
  ↓
[List দেখাবে]

┌─────────────────────────────────────┐
│ 🎓 Class 11 → 12 (2024 → 2025)      │
│ Batch ID: a1b2c3d4...               │
│ Date: 15 Jan 2025, 10:30 AM         │
│ By: Admin Sabbir                    │
│ Promoted: 45 জন                     │
│ Session: 2024-25                    │
│                                     │
│ [View Details] [🔄 Restore]         │
└─────────────────────────────────────┘
```

### 🔄 Restore কী করে?

```
1. নতুন insert করা students → delete
2. পুরোনো (source) students → restore
3. Subjects → restore
4. Batch status: "rolled_back"
```

### ⚠️ Sতর্কতা

- ✅ একবারই restore করা যাবে
- ✅ Restore করার পর batch-এ "rolled_back" mark
- ❌ Restore-এর পর আবার restore করা যাবে না

---

## ৭. Subject Pairing (BM Branch)

### 🎯 BM Branch-এ কী হয়?

**HSC-তে:** subject **as-is copy** হয় (same থাকে)।

**BM-তে:** Class change হলে **pair swap** হয়।

### 📋 উদাহরণ

```
Class 11-এ BM student-এর subject: "বাংলা-১ম পত্র"
        ↓ Promote (11 → 12)
Class 12-এ তার subject: "বাংলা-২য় পত্র"
```

**কারণ:** BM-এ প্রতিটা subject-এর একটা paired version আছে।

### 🔗 Paired Subject Setup

**Database-এ:**
```sql
subjects table
├── subject: "বাংলা-১ম পত্র"
│   paired_with_id → "বাংলা-২য় পত্র"-এর ID
└── subject: "বাংলা-২য় পত্র"
    paired_with_id → "বাংলা-১ম পত্র"-এর ID
```

**Admin → Subjects-এ setup করা যায়।**

### ⚙️ Automatic Swap

- Promote-এ **স্বয়ংক্রিয়ভাবে** swap হবে
- Manual কিছু করতে হবে না
- Console log-এ দেখাবে: `🔄 BM swap: [name]`

---

## ৮. Troubleshooting

### 🔴 সমস্যা ১: "কোনো student পাওয়া যায়নি"

**কারণ:**
- Source class/year/branch-এ student নেই
- অথবা সব student-এর result entry নেই

**সমাধান:**
```
1. Admin → Students → Filter verify
2. Admin → Results → Result entry check
3. Result publish করেছেন কি না check
```

---

### 🔴 সমস্যা ২: "Pass student auto-check হয়নি"

**কারণ:**
- Result publish হয়নি
- Result-এ `is_published = false`

**সমাধান:**
```
Admin → Results → Source select
→ [Publish] button ক্লিক
```

---

### 🔴 সমস্যা ৩: "Session বদলে গেছে!"

**কারণ:**
- পুরোনো version-এর code
- অথবা database-এ ভুল session

**সমাধান:**
```
1. Hard refresh করুন (Ctrl+Shift+R)
2. Browser cache clear
3. Console log check করুন:
   "✅ Session preserved for [name]: 2024-25"
```

**যদি তারপরো সমস্যা:**
- Console log-এ error দেখুন
- Screenshot নিয়ে developer-কে দেখান

---

### 🔴 সমস্যা ৪: "Target delete হলে data হারাবো"

**সমাধান:**
- Execute-এর আগে backup নিন
- Restore system থাকবে
- অথবা **Copy** mode ব্যবহার করুন

---

### 🔴 সমস্যা ৫: "BM subject swap হয়নি"

**কারণ:**
- `paired_with_id` set করা নেই

**সমাধান:**
```
Admin → Subjects
→ Subject edit
→ Paired with → select pair
→ Save
```

---

## ৯. FAQ

### ❓ Promote করার পর board exam fail হলে?

**উত্তর:** বোর্ড exam board-এর দায়িত্ব। আপনার website-এ track হবে না।

---

### ❓ Session কী কখনো বদলাবে?

**উত্তর:** না। Session = ভর্তির বছর। একবার set হলে কখনো বদলায় না।

---

### ❓ একই student দুইবার promote হলে?

**উত্তর:** সম্ভব না। Promote-এর পর source থেকে delete হয়ে যায়।

---

### ❓ Bulk-এ 50 জন promote করা যাবে?

**উত্তর:** হ্যাঁ। তেমন কোনো limit নেই।

---

### ❓ Restore করার পর data কি ঠিক থাকবে?

**উত্তর:** হ্যাঁ। `promotion_audit` table-এ সব snapshot থাকে।

---

### ❓ Subject-এ cambio করলে কী হবে?

**উত্তর:** Promote-এর পর subject change করতে হলে **Admin → Students → Edit** ব্যবহার করুন।

---

### ❓ Fail student-দের কী হবে?

**উত্তর:** Class 11-এ থাকবে। পরের বছর আবার Final দিতে হবে।

---

### ❓ Promote-এর পর কি year বদলাবে?

**উত্তর:** হ্যাঁ। Class 11 → 12 হলে year: 2024 → 2025, কিন্তু session: 2024-25 same।

---

### ❓ Session আর Year-এর পার্থক্য কী?

| বিষয় | Year | Session |
|------|------|---------|
| মানে | কোন বছরে পড়ছে | কোন batch-এর |
| উদাহরণ | 2024, 2025 | 2024-25 |
| বদলায়? | Class change-এ হ্যাঁ | না |

---

## 📞 Support

**সমস্যা হলে:**
1. এই guide-এর Troubleshooting section দেখুন
2. Console log check করুন (F12)
3. Screenshot নিয়ে developer-কে পাঠান

**Contact:** [আপনার contact info]

---

**🎓 এই guide follow করলে Promote System নিরাপদভাবে ব্যবহার করতে পারবেন।**

**Last Updated:** Session Fix v2.0