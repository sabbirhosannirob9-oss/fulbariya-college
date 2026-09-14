// ============================================================
// FULBARIYA COLLEGE - GLOBAL CONFIG
// ============================================================

window.FDC_CONFIG = {

    // ----------------------------------------------------------
    // SUPABASE
    // ----------------------------------------------------------

    SUPABASE_URL:
        "https://dpbbsfppjmgvzsopmdww.supabase.co",

    SUPABASE_PUBLISHABLE_KEY:
        "sb_publishable_O0gApiitS1P9graqe1cjKA_f8KJRUD5",


    // ----------------------------------------------------------
    // CLOUDINARY
    // ----------------------------------------------------------

    CLOUDINARY: {

        CLOUD_NAME:
            "awxusvtg",

        UPLOAD_PRESET:
            "college_unsigned",

        FOLDER:
            "fulbariya-college",

        IMAGE_UPLOAD_URL:
            "https://api.cloudinary.com/v1_1/awxusvtg/image/upload",

        RAW_UPLOAD_URL:
            "https://api.cloudinary.com/v1_1/awxusvtg/raw/upload"

    }

};

console.log("✅ FDC_CONFIG loaded");