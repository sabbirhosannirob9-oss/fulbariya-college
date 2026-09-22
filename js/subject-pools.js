/**
 * =========================================================
 * FULBARIYA COLLEGE — SUBJECT POOLS
 * Location: js/subject-pools.js
 * Version: v1.0
 * Purpose: HSC-General + BM Subject definitions
 * =========================================================
 */

window.FDC_SUBJECT_POOLS = (function () {
    "use strict";

    // =========================================================
    // HSC-GENERAL — Compulsory (সবার জন্য)
    // =========================================================
    const COMPULSORY = [
        { code: '101', name: 'বাংলা', name_en: 'Bangla' },
        { code: '107', name: 'English', name_en: 'English' },
        { code: '275', name: 'তথ্য ও যোগাযোগ প্রযুক্তি', name_en: 'ICT' }
    ];

    // =========================================================
    // HSC-GENERAL — Science Group
    // =========================================================
    const SCIENCE = {
        label: 'Science',
        label_bn: 'বিজ্ঞান',
        fixed: [
            { code: '174', name: 'পদার্থবিজ্ঞান', name_en: 'Physics' },
            { code: '176', name: 'রসায়ন', name_en: 'Chemistry' }
        ],
        choice: [
            { code: '178', name: 'জীববিজ্ঞান', name_en: 'Biology' },
            { code: '265', name: 'উচ্চতর গণিত', name_en: 'Higher Math' },
            { code: '255', name: 'কৃষিশিক্ষা', name_en: 'Agriculture' },
            { code: '129', name: 'পরিসংখ্যান', name_en: 'Statistics' },
            { code: '185', name: 'ইলেকট্রনিক্স', name_en: 'Electronics' },
            { code: '117', name: 'ভূগোল', name_en: 'Geography' },
            { code: '123', name: 'মনোবিজ্ঞান', name_en: 'Psychology' }
        ],
        mainCount: 3,
        fixedCount: 2,
        choiceCount: 1
    };

    // =========================================================
    // HSC-GENERAL — Business Group
    // =========================================================
    const BUSINESS = {
        label: 'Business',
        label_bn: 'ব্যবসায় শিক্ষা',
        fixed: [
            { code: '253', name: 'হিসাববিজ্ঞান', name_en: 'Accounting' },
            { code: '277', name: 'ব্যবসায় সংগঠন ও ব্যবস্থাপনা', name_en: 'Business Org & Management' }
        ],
        choice: [
            { code: '286', name: 'উৎপাদন ব্যবস্থাপনা ও বিপণন', name_en: 'Production Mgmt & Marketing' },
            { code: '292', name: 'ফিন্যান্স, ব্যাংকিং ও বিমা', name_en: 'Finance, Banking & Insurance' },
            { code: '129', name: 'পরিসংখ্যান', name_en: 'Statistics' },
            { code: '255', name: 'কৃষিশিক্ষা', name_en: 'Agriculture' }
        ],
        mainCount: 3,
        fixedCount: 2,
        choiceCount: 1
    };

    // =========================================================
    // HSC-GENERAL — Humanities Group
    // =========================================================
    const HUMANITIES = {
        label: 'Humanities',
        label_bn: 'মানবিক',
        fixed: [],
        choice: [
            { code: '269', name: 'পৌরনীতি ও সুশাসন', name_en: 'Civics & Good Governance' },
            { code: '109', name: 'অর্থনীতি', name_en: 'Economics' },
            { code: '121', name: 'যুক্তিবিদ্যা', name_en: 'Logic' },
            { code: '267', name: 'ইসলামের ইতিহাস ও সংস্কৃতি', name_en: 'Islamic History & Culture' },
            { code: '304', name: 'ইসলাম শিক্ষা', name_en: 'Islamic Studies' },
            { code: '302', name: 'ইতিহাস', name_en: 'History' },
            { code: '117', name: 'ভূগোল', name_en: 'Geography' },
            { code: '119', name: 'সমাজবিজ্ঞান', name_en: 'Sociology' },
            { code: '127', name: 'সমাজকর্ম', name_en: 'Social Work' },
            { code: '255', name: 'কৃষিশিক্ষা', name_en: 'Agriculture' },
            { code: '129', name: 'পরিসংখ্যান', name_en: 'Statistics' }
        ],
        mainCount: 3,
        fixedCount: 0,
        choiceCount: 3
    };

    // =========================================================
    // 4th Subject Pool (per group)
    // =========================================================
    const FOURTH_POOL = {
        'Science': [
            { code: '178', name: 'জীববিজ্ঞান', name_en: 'Biology' },
            { code: '265', name: 'উচ্চতর গণিত', name_en: 'Higher Math' },
            { code: '255', name: 'কৃষিশিক্ষা', name_en: 'Agriculture' },
            { code: '129', name: 'পরিসংখ্যান', name_en: 'Statistics' },
            { code: '185', name: 'ইলেকট্রনিক্স', name_en: 'Electronics' },
            { code: '117', name: 'ভূগোল', name_en: 'Geography' },
            { code: '123', name: 'মনোবিজ্ঞান', name_en: 'Psychology' }
        ],
        'Business': [
            { code: '253', name: 'হিসাববিজ্ঞান', name_en: 'Accounting' },
            { code: '277', name: 'ব্যবসায় সংগঠন ও ব্যবস্থাপনা', name_en: 'Business Org & Management' },
            { code: '286', name: 'উৎপাদন ব্যবস্থাপনা ও বিপণন', name_en: 'Production Mgmt & Marketing' },
            { code: '292', name: 'ফিন্যান্স, ব্যাংকিং ও বিমা', name_en: 'Finance, Banking & Insurance' },
            { code: '109', name: 'অর্থনীতি', name_en: 'Economics' },
            { code: '255', name: 'কৃষিশিক্ষা', name_en: 'Agriculture' },
            { code: '129', name: 'পরিসংখ্যান', name_en: 'Statistics' },
            { code: '117', name: 'ভূগোল', name_en: 'Geography' }
        ],
        'Humanities': [
            { code: '269', name: 'পৌরনীতি ও সুশাসন', name_en: 'Civics' },
            { code: '109', name: 'অর্থনীতি', name_en: 'Economics' },
            { code: '121', name: 'যুক্তিবিদ্যা', name_en: 'Logic' },
            { code: '267', name: 'ইসলামের ইতিহাস ও সংস্কৃতি', name_en: 'Islamic History' },
            { code: '304', name: 'ইসলাম শিক্ষা', name_en: 'Islamic Studies' },
            { code: '302', name: 'ইতিহাস', name_en: 'History' },
            { code: '119', name: 'সমাজবিজ্ঞান', name_en: 'Sociology' },
            { code: '127', name: 'সমাজকর্ম', name_en: 'Social Work' },
            { code: '117', name: 'ভূগোল', name_en: 'Geography' },
            { code: '255', name: 'কৃষিশিক্ষা', name_en: 'Agriculture' },
            { code: '129', name: 'পরিসংখ্যান', name_en: 'Statistics' }
        ]
    };

    // =========================================================
    // HSC-BM (BMT) — Trade + Compulsory
    // =========================================================
    const BM = {
        label: 'HSC-BM',
        label_bn: 'এইচএসসি (বিএম)',
        compulsory: [
            { code: 'BM-101', name: 'বাংলা', name_en: 'Bangla' },
            { code: 'BM-102', name: 'English', name_en: 'English' },
            { code: 'BM-103', name: 'তথ্য ও যোগাযোগ প্রযুক্তি', name_en: 'ICT' },
            { code: 'BM-104', name: 'গণিত', name_en: 'Mathematics' },
            { code: 'BM-105', name: 'হিসাববিজ্ঞান', name_en: 'Accounting' },
            { code: 'BM-106', name: 'ব্যবসায় সংগঠন ও ব্যবস্থাপনা', name_en: 'Business Org & Management' },
            { code: 'BM-107', name: 'ফিন্যান্স, ব্যাংকিং ও বিমা', name_en: 'Finance, Banking & Insurance' },
            { code: 'BM-108', name: 'উৎপাদন ব্যবস্থাপনা ও বিপণন', name_en: 'Production Mgmt & Marketing' }
        ],
        trades: [
            { code: 'BM-T1', name: 'Computerized Accounting System', name_bn: 'কম্পিউটারাইজড অ্যাকাউন্টিং সিস্টেম' },
            { code: 'BM-T2', name: 'Digital Technology in Business', name_bn: 'ডিজিটাল টেকনোলজি ইন বিজনেস' },
            { code: 'BM-T3', name: 'Human Resource Development', name_bn: 'হিউম্যান রিসোর্স ডেভেলপমেন্ট' }
        ]
    };

    // =========================================================
    // PUBLIC API
    // =========================================================
    return {
        COMPULSORY: COMPULSORY,
        SCIENCE: SCIENCE,
        BUSINESS: BUSINESS,
        HUMANITIES: HUMANITIES,
        FOURTH_POOL: FOURTH_POOL,
        BM: BM,

        getGroupData: function (groupName) {
            if (groupName === 'Science') return SCIENCE;
            if (groupName === 'Business') return BUSINESS;
            if (groupName === 'Humanities') return HUMANITIES;
            return null;
        },

        getFourthPool: function (groupName) {
            return FOURTH_POOL[groupName] || [];
        },

        getFilteredFourthPool: function (groupName, selectedMainCodes) {
            const pool = FOURTH_POOL[groupName] || [];
            const selected = selectedMainCodes || [];
            return pool.filter(s => !selected.includes(s.code));
        },

        getGroupLabel: function (groupName) {
            const g = this.getGroupData(groupName);
            return g ? g.label : groupName;
        }
    };
})();