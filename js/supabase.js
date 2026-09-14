// ============================================================
// FULBARIYA COLLEGE
// SUPABASE INITIALIZATION
// ============================================================

(function () {

    "use strict";

    console.log("🔵 Supabase initialization started...");


    function initializeSupabase() {

        // ------------------------------------------------------
        // Check Supabase CDN
        // ------------------------------------------------------

        if (!window.supabase) {

            console.error(
                "❌ Supabase CDN library not loaded."
            );

            window.FDC_SUPABASE = null;
            window.FDC_SUPABASE_READY = false;

            return false;
        }


        // ------------------------------------------------------
        // Check configuration
        // ------------------------------------------------------

        if (!window.FDC_CONFIG) {

            console.error(
                "❌ FDC_CONFIG not found."
            );

            window.FDC_SUPABASE = null;
            window.FDC_SUPABASE_READY = false;

            return false;
        }


        const url =
            window.FDC_CONFIG.SUPABASE_URL;

        const key =
            window.FDC_CONFIG.SUPABASE_PUBLISHABLE_KEY;


        if (!url || !key) {

            console.error(
                "❌ Supabase URL or Publishable Key missing."
            );

            window.FDC_SUPABASE = null;
            window.FDC_SUPABASE_READY = false;

            return false;
        }


        // ------------------------------------------------------
        // Create Supabase client
        // ------------------------------------------------------

        try {

            window.FDC_SUPABASE =
                window.supabase.createClient(
                    url,
                    key,
                    {
                        auth: {
                            autoRefreshToken: true,
                            persistSession: true,
                            detectSessionInUrl: true
                        }
                    }
                );


            window.FDC_SUPABASE_READY = true;


            console.log(
                "✅ Supabase client created successfully."
            );

            console.log(
                "✅ FDC_SUPABASE_READY:",
                window.FDC_SUPABASE_READY
            );


            // --------------------------------------------------
            // Notify other scripts
            // --------------------------------------------------

            window.dispatchEvent(
                new CustomEvent(
                    "fdc:supabase-ready"
                )
            );


            return true;

        } catch (error) {

            console.error(
                "❌ Supabase client creation failed:",
                error
            );

            window.FDC_SUPABASE = null;
            window.FDC_SUPABASE_READY = false;

            return false;
        }

    }


    // ----------------------------------------------------------
    // CDN already available
    // ----------------------------------------------------------

    if (window.supabase) {

        initializeSupabase();

    } else {

        // ------------------------------------------------------
        // Wait for CDN
        // ------------------------------------------------------

        let attempts = 0;

        const maxAttempts = 50;

        const timer = setInterval(
            function () {

                attempts++;

                if (window.supabase) {

                    clearInterval(timer);

                    initializeSupabase();

                    return;
                }


                if (attempts >= maxAttempts) {

                    clearInterval(timer);

                    console.error(
                        "❌ Supabase CDN failed to load."
                    );

                    window.FDC_SUPABASE = null;
                    window.FDC_SUPABASE_READY = false;
                }

            },
            100
        );

    }

})();