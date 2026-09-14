// ============================================================
// FULBARIYA COLLEGE
// CLOUDINARY UPLOAD SYSTEM
// ============================================================

(function () {

    "use strict";


    // ----------------------------------------------------------
    // Get Cloudinary Config
    // ----------------------------------------------------------

    function getCloudinaryConfig() {

        if (!window.FDC_CONFIG) {
            throw new Error(
                "FDC_CONFIG পাওয়া যায়নি।"
            );
        }

        if (!window.FDC_CONFIG.CLOUDINARY) {
            throw new Error(
                "Cloudinary configuration পাওয়া যায়নি।"
            );
        }

        return window.FDC_CONFIG.CLOUDINARY;
    }


    // ==========================================================
    // IMAGE UPLOAD
    // ==========================================================

    async function uploadImage(file) {

        if (!file) {
            throw new Error(
                "কোনো image file নির্বাচন করা হয়নি।"
            );
        }


        // ------------------------------------------------------
        // Validate image
        // ------------------------------------------------------

        if (!file.type.startsWith("image/")) {

            throw new Error(
                "শুধুমাত্র image file upload করা যাবে।"
            );
        }


        const config =
            getCloudinaryConfig();


        console.log(
            "☁️ Uploading image to Cloudinary..."
        );


        const formData =
            new FormData();

        formData.append(
            "file",
            file
        );

        formData.append(
            "upload_preset",
            config.UPLOAD_PRESET
        );


        // Folder preset-এ configured থাকলে সেটাই ব্যবহার হবে।
        // তারপরও folder পাঠানো হচ্ছে না যাতে preset configuration
        // এর সাথে conflict না হয়।


        const response =
            await fetch(
                config.IMAGE_UPLOAD_URL,
                {
                    method: "POST",
                    body: formData
                }
            );


        const result =
            await response.json();


        if (!response.ok) {

            console.error(
                "❌ Cloudinary image upload error:",
                result
            );

            throw new Error(
                result.error?.message ||
                "Image upload failed."
            );
        }


        console.log(
            "✅ Image uploaded:",
            result.secure_url
        );


        return {

            url:
                result.secure_url,

            secure_url:
                result.secure_url,

            public_id:
                result.public_id,

            asset_id:
                result.asset_id,

            width:
                result.width,

            height:
                result.height,

            format:
                result.format,

            resource_type:
                result.resource_type

        };

    }


    // ==========================================================
    // RAW / PDF UPLOAD
    // ==========================================================

    async function uploadPDF(file) {

        if (!file) {

            throw new Error(
                "কোনো PDF file নির্বাচন করা হয়নি।"
            );
        }


        // ------------------------------------------------------
        // Validate PDF
        // ------------------------------------------------------

        if (
            file.type !== "application/pdf" &&
            !file.name.toLowerCase().endsWith(".pdf")
        ) {

            throw new Error(
                "শুধুমাত্র PDF file upload করা যাবে।"
            );
        }


        const config =
            getCloudinaryConfig();


        console.log(
            "☁️ Uploading PDF to Cloudinary..."
        );


        const formData =
            new FormData();


        formData.append(
            "file",
            file
        );

        formData.append(
            "upload_preset",
            config.UPLOAD_PRESET
        );


        const response =
            await fetch(
                config.RAW_UPLOAD_URL,
                {
                    method: "POST",
                    body: formData
                }
            );


        const result =
            await response.json();


        if (!response.ok) {

            console.error(
                "❌ Cloudinary PDF upload error:",
                result
            );

            throw new Error(
                result.error?.message ||
                "PDF upload failed."
            );
        }


        console.log(
            "✅ PDF uploaded:",
            result.secure_url
        );


        return {

            url:
                result.secure_url,

            secure_url:
                result.secure_url,

            public_id:
                result.public_id,

            asset_id:
                result.asset_id,

            format:
                result.format,

            resource_type:
                result.resource_type

        };

    }


    // ==========================================================
    // GLOBAL API
    // ==========================================================

    window.FDCUploadImage =
        uploadImage;

    window.FDCUploadPDF =
        uploadPDF;


    console.log(
        "✅ Cloudinary system ready."
    );

})();