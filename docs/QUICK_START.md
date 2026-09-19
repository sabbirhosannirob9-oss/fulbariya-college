# ⚡ Fulbariya College — Quick Start

**সময়:** ৫ মিনিটে সেটআপ

---

## 🎯 Common Tasks

### 1. নতুন Student যোগ করুন

```
Admin → Students → [Add Student]
├── Name, Roll
├── Class, Year, Branch, Group
├── Subjects select
└── [Save]
```

### 2. Bulk-এ 50 জন Student

```
Admin → Students → [Bulk Import]
├── Class, Year, Branch, Group
├── Main 3 subjects select
├── 4th subject select
├── List paste: "101, name"
└── [Preview] → [Save All]
```

### 3. Result Entry করুন

```
Admin → Results
├── Exam, Class, Year, Branch, Group
├── [Load Students]
├── Book tab click
├── Marks দিন
└── [Publish]
```

### 4. Promote করুন

```
Admin → Promote Students
├── Source: Class 11
├── Target: Class 12
├── Pass auto-checked
├── [Execute]
└── ✅ Session preserved
```

### 5. Result Check (Student)

```
results.html
├── Roll, Class, Year, Exam, Group
├── [Search]
├── Preview
└── [View Full Result]
```

---

## 🔗 Important URLs

| Page | URL |
|------|-----|
| **Home** | `/index.html` |
| **Admin Login** | `/admin-pages/admin-login.html` |
| **Admin Dashboard** | `/admin-pages/admin-dashboard.html` |
| **Students** | `/admin-pages/admin-students.html` |
| **Results** | `/admin-pages/admin-results.html` |
| **Promote** | `/admin-pages/admin-promote.html` |
| **Result Search** | `/public-pages/results.html` |
| **Result Sheet** | `/public-pages/result-details.html` |

---

## 🎯 সোনালি নিয়ম

```
১. Session = ভর্তির বছর → কখনো বদলায় না
২. Result Publish না করলে → Promote কাজ করবে না
৩. Bulk Import → 15 মিনিটে 100 student
৪. Auto GPA → Marks দিলেই calculate হবে
৫. Target delete → পুরোনো সব মুছে যাবে
```

---

## 🚨 সমস্যা হলে

```
১. Hard refresh: Ctrl+Shift+R
২. Console check: F12
৩. Admin Manual দেখুন: docs/ADMIN_MANUAL.md
৪. Support-এ যোগাযোগ করুন
```

---

## 📊 Quick Reference

### Bulk Import Format

```
Format 1 (Basic):
101, মোঃ রহিম
102, করিম উদ্দিন
103, সজীব আহমেদ

Format 2 (4th override):
101, Sabbir
102, Rahim, Biology
103, Karim, Agricultural
```

### Result Entry Tips

```
১. Bulk Fill → সব Practical=25 (এক click)
২. Auto Tab → CQ → MCQ → P → Next
৩. Live GPA → সাথে সাথে calculate
৪. Progress → 100% হলে Publish enable
```

### Promote Checklist

```
✅ Final exam result entry
✅ Result [Publish] (must!)
✅ Source select
✅ Pass students auto-check
✅ Target select
✅ "DELETE [year]" type
✅ Execute
✅ Verify (session same?)
```

---

**🎓 Quick Start Complete**