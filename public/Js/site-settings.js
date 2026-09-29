// ==========================================
// NED HUB - GLOBAL SITE SETTINGS
// ==========================================

async function loadSiteSettings() {

    try {

        const response =
            await fetch("/api/settings", {
                credentials: "include"
            });

        if (!response.ok) {
            throw new Error(
                "Failed to load site settings."
            );
        }

        const data =
            await response.json();

        if (!data.success) {

            console.error(
                "Site settings error:",
                data.message ||
                "Unable to load settings."
            );

            return;
        }

        const settings =
            data.settings || {};


        // ==========================================
        // SAVE SETTINGS GLOBALLY
        // ==========================================

        window.NED_HUB_SETTINGS =
            settings;


        // ==========================================
        // GLOBAL COLORS
        // ==========================================

        const root =
            document.documentElement;

        const setColor =
            (variable, value, fallback) => {

                root.style.setProperty(
                    variable,
                    value || fallback
                );

            };


        setColor(
            "--ned-primary",
            settings.primary_color,
            "#0080ff"
        );


        setColor(
            "--ned-secondary",
            settings.secondary_color,
            "#00aaff"
        );


        setColor(
            "--ned-accent",
            settings.accent_color,
            "#ffd700"
        );


        setColor(
            "--ned-header",
            settings.header_color,
            "#071a33"
        );


        setColor(
            "--ned-background",
            settings.background_color,
            "#f5f7fb"
        );


        setColor(
            "--ned-button",
            settings.button_color,
            "#0080ff"
        );


        setColor(
            "--ned-button-text",
            settings.button_text_color,
            "#ffffff"
        );


        setColor(
            "--ned-gradient-1",
            settings.gradient_color_1,
            "#071a33"
        );


        setColor(
            "--ned-gradient-2",
            settings.gradient_color_2,
            "#0080ff"
        );


        setColor(
            "--ned-gradient-3",
            settings.gradient_color_3,
            "#00aaff"
        );


        setColor(
            "--ned-text",
            settings.text_color,
            "#111827"
        );


        setColor(
            "--ned-card",
            settings.card_color,
            "#ffffff"
        );


        setColor(
            "--ned-border",
            settings.border_color,
            "#eeeeee"
        );


        setColor(
            "--ned-muted",
            settings.muted_color,
            "#555555"
        );


        // ==========================================
        // NED / HUB LOGO COLORS
        // ==========================================

        const nedLogoColor =
            settings.ned_logo_color ||
            "#ffffff";

        const hubLogoColor =
            settings.hub_logo_color ||
            "#ffd700";


        // ==========================================
        // CREATE / UPDATE SPLIT NED + HUB LOGOS
        // ==========================================

        document
            .querySelectorAll(".logo")
            .forEach(element => {

                if (
                    element.dataset.nedHubLogoApplied === "true"
                ) {
                    return;
                }


                const currentText =
                    element.textContent
                        .replace(/\s+/g, " ")
                        .trim();


                const words =
                    currentText
                        .split(" ")
                        .filter(Boolean);


                const nedText =
                    words[0] || "NED";


                const hubText =
                    words.slice(1).join(" ") ||
                    "HUB";


                element.innerHTML = `
                    <span
                        data-ned-logo
                        style="color:${nedLogoColor};"
                    >${nedText}</span><span
                        data-hub-logo
                        style="color:${hubLogoColor};"
                    >${hubText}</span>
                `;


                element.dataset.nedHubLogoApplied =
                    "true";

            });


        // ==========================================
        // APPLY NED COLOUR
        // ==========================================

        document
            .querySelectorAll("[data-ned-logo]")
            .forEach(element => {

                element.style.setProperty(
                    "color",
                    nedLogoColor,
                    "important"
                );

            });


        // ==========================================
        // APPLY HUB COLOUR
        // ==========================================

        document
            .querySelectorAll("[data-hub-logo]")
            .forEach(element => {

                element.style.setProperty(
                    "color",
                    hubLogoColor,
                    "important"
                );

            });


        // ==========================================
        // COMPATIBILITY COLORS
        // ==========================================

        setColor(
            "--primary",
            settings.primary_color,
            "#0080ff"
        );


        setColor(
            "--secondary",
            settings.secondary_color,
            "#00aaff"
        );


        setColor(
            "--accent",
            settings.accent_color,
            "#ffd700"
        );


        setColor(
            "--dark",
            settings.header_color,
            "#111827"
        );


        setColor(
            "--light",
            settings.background_color,
            "#f5f7fa"
        );


        setColor(
            "--white",
            settings.card_color,
            "#ffffff"
        );


        setColor(
            "--header-color",
            settings.header_color,
            "#0080ff"
        );


        // ==========================================
        // EFFECT OPACITY
        // ==========================================

        root.style.setProperty(
            "--ned-effect-opacity",
            settings.effect_intensity ||
            "1"
        );


        // ==========================================
        // GRADIENT SPEED
        // ==========================================

        root.style.setProperty(
            "--ned-gradient-speed",
            (settings.gradient_speed || "6") + "s"
        );


        // ==========================================
        // DARK / LIGHT MODE
        // ==========================================

        const theme =
            settings.theme_mode ||
            settings.theme ||
            "light";


        document.body.setAttribute(
            "data-theme",
            theme
        );


        document.documentElement.setAttribute(
            "data-theme",
            theme
        );


        // ==========================================
        // GRADIENT ANIMATION
        // ==========================================

        const gradientAnimation =
            settings.gradient_animation !== "false";


        document.body.classList.toggle(
            "ned-gradient-animation",
            gradientAnimation
        );


        // ==========================================
        // MOVING BACKGROUND
        // ==========================================

        document.body.classList.toggle(
            "ned-background-shake",
            gradientAnimation
        );


        // ==========================================
        // FLOATING BLOBS
        // ==========================================

        const floatingBlobs =
            settings.floating_blobs === true ||
            settings.floating_blobs === "true";


        document.body.classList.toggle(
            "ned-floating-blobs",
            floatingBlobs
        );


        // ==========================================
        // GLOW
        // ==========================================

        const glowEnabled =
            settings.glow_enabled === true ||
            settings.glow_enabled === "true";


        document.body.classList.toggle(
            "ned-glow-enabled",
            glowEnabled
        );


        // ==========================================
        // ANIMATED HEADER
        // ==========================================

        const animatedHeader =
            settings.animated_header === true ||
            settings.animated_header === "true";


        document.body.classList.toggle(
            "ned-animated-header",
            animatedHeader
        );


        // ==========================================
        // ANIMATED BUTTONS
        // ==========================================

        const animatedButtons =
            settings.animated_buttons === true ||
            settings.animated_buttons === "true";


        document.body.classList.toggle(
            "ned-animated-buttons",
            animatedButtons
        );


        // ==========================================
        // SHOP NAME - GLOBAL MASTER NAME
        // ==========================================

        const shopName =
            String(
                settings.store_name ||
                settings.header_store_name ||
                "NED HUB"
            ).trim();


        // ==========================================
        // SAVE SHOP NAME FOR OTHER JAVASCRIPT FILES
        // ==========================================

        window.NED_HUB_SHOP_NAME =
            shopName;


        // ==========================================
        // UPDATE ALL SHOP NAME ELEMENTS
        // ==========================================

        document
            .querySelectorAll(
                "[data-shop-name], [data-store-name]"
            )
            .forEach(element => {

                // Do not destroy the separate
                // NED/HUB logo spans.
                if (
                    element.querySelector(
                        "[data-ned-logo], [data-hub-logo]"
                    )
                ) {
                    return;
                }


                element.textContent =
                    shopName;

            });


        // ==========================================
        // PAGE TITLE
        // ==========================================

        const originalTitle =
            document.title || "";


        const cleanedTitle =
            originalTitle
                .replace(
                    /^NED HUB\s*\|\s*/i,
                    ""
                )
                .trim();


        if (
            !cleanedTitle ||
            cleanedTitle === "NED HUB" ||
            cleanedTitle === "Shop"
        ) {

            document.title =
                shopName + " | Shop";

        } else {

            document.title =
                cleanedTitle +
                " | " +
                shopName;

        }


        // ==========================================
        // TAGLINE
        // ==========================================

        document
            .querySelectorAll(
                "[data-shop-tagline], [data-store-tagline]"
            )
            .forEach(element => {

                element.textContent =
                    settings.store_tagline ||
                    "Your online shopping destination.";

            });


        // ==========================================
        // PHONE
        // ==========================================

        document
            .querySelectorAll(
                "[data-shop-phone], [data-store-phone]"
            )
            .forEach(element => {

                element.textContent =
                    settings.store_phone ||
                    "";

            });


        // ==========================================
        // EMAIL
        // ==========================================

        document
            .querySelectorAll(
                "[data-shop-email], [data-store-email]"
            )
            .forEach(element => {

                element.textContent =
                    settings.store_email ||
                    "";

            });


        // ==========================================
        // ADDRESS
        // ==========================================

        document
            .querySelectorAll(
                "[data-shop-address], [data-store-address]"
            )
            .forEach(element => {

                element.textContent =
                    settings.store_address ||
                    "";

            });


        // ==========================================
        // WHATSAPP
        // ==========================================

        document
            .querySelectorAll(
                "[data-shop-whatsapp], [data-whatsapp]"
            )
            .forEach(element => {

                if (settings.whatsapp_number) {

                    const cleanNumber =
                        String(
                            settings.whatsapp_number
                        ).replace(
                            /\D/g,
                            ""
                        );


                    element.href =
                        "https://wa.me/" +
                        cleanNumber;


                    element.style.display =
                        "inline-flex";

                } else {

                    element.style.display =
                        "none";

                }

            });


        // ==========================================
        // LOG
        // ==========================================

        console.log(
            "NED HUB global site settings loaded."
        );


        console.log(
            "Current shop name:",
            shopName
        );


        console.log(
            "NED logo colour:",
            nedLogoColor
        );


        console.log(
            "HUB logo colour:",
            hubLogoColor
        );


    } catch (error) {

        console.error(
            "Site settings error:",
            error
        );

    }

}


// ==========================================
// RUN AUTOMATICALLY
// ==========================================

if (
    document.readyState === "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        loadSiteSettings
    );

} else {

    loadSiteSettings();

}