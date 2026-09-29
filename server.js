const path = require("path");

/* =========================================
   LOAD ENVIRONMENT VARIABLES
========================================= */

require("dotenv").config({
    path: path.join(__dirname, ".env")
});


/* =========================================
   IMPORT MODULES
========================================= */

const express = require("express");
const mysql = require("mysql2/promise");
const session = require("express-session");
const nodemailer = require("nodemailer");
const bcrypt = require("bcryptjs");
const multer = require("multer");

// ==========================================
// BANNER IMAGE UPLOAD
// ==========================================

const bannerStorage = multer.diskStorage({

    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, "uploads"));
    },

    filename: function (req, file, cb) {

        const extension =
            path.extname(file.originalname);

        const filename =
            "banner-" +
            Date.now() +
            extension;

        cb(null, filename);
    }

});

const bannerUpload = multer({

    storage: bannerStorage,

    limits: {
        fileSize: 5 * 1024 * 1024
    },

    fileFilter: function (req, file, cb) {

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif"
        ];

        if (allowedTypes.includes(file.mimetype)) {

            cb(null, true);

        } else {

            cb(
                new Error(
                    "Only JPG, PNG, WEBP and GIF images are allowed."
                )
            );

        }

    }

});


/* =========================================
   ENVIRONMENT CHECK
========================================= */

console.log("---------------------------------");
console.log("NED HUB ENVIRONMENT");
console.log("---------------------------------");

console.log("ENV FILE:", path.join(__dirname, ".env"));
console.log("DB_HOST:", process.env.DB_HOST);
console.log("DB_USER:", process.env.DB_USER);
console.log("DB_NAME:", process.env.DB_NAME);

console.log(
    "SESSION_SECRET loaded:",
    !!process.env.SESSION_SECRET
);

console.log(
    "EMAIL_USER loaded:",
    !!process.env.EMAIL_USER
);

console.log(
    "EMAIL_PASSWORD loaded:",
    !!process.env.EMAIL_PASSWORD
);

console.log("---------------------------------");


/* =========================================
   EXPRESS APP
========================================= */

const app = express();

console.log("🔥 THIS IS THE NED HUB SERVER.JS FILE");

const PORT = 3000;


/* =========================================
   MYSQL DATABASE
========================================= */

const db = mysql.createPool({

    host: process.env.DB_HOST,

    port: Number(process.env.DB_PORT || 3306),

    user: process.env.DB_USER,

    password: process.env.DB_PASSWORD || "",

    database: process.env.DB_NAME,

    waitForConnections: true,

    connectionLimit: 10,

    queueLimit: 0,

    ssl: {
        rejectUnauthorized: false
    }

});


/* =========================================
   TEST DATABASE
========================================= */

async function testDatabase() {

    try {

        const connection =
            await db.getConnection();

        console.log("---------------------------------");
        console.log(
            "MySQL database connected successfully."
        );
        console.log(
            "Database:",
            process.env.DB_NAME
        );
        console.log("---------------------------------");

        connection.release();

    } catch (error) {

        console.error("---------------------------------");
        console.error(
            "MySQL database connection FAILED."
        );
        console.error(
            "Error:",
            error.message
        );
        console.error("---------------------------------");

    }

}

testDatabase();


/* =========================================
   CUSTOMER CARE TABLE
========================================= */

async function createCustomerCareTable() {

    try {

        await db.query(`
            CREATE TABLE IF NOT EXISTS customer_care_messages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                sender_type ENUM('customer', 'admin') NOT NULL,
                message TEXT NOT NULL,
                is_read TINYINT(1) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log("Customer Care table is ready.");

    } catch (error) {

        console.error(
            "Customer Care table creation failed:",
            error.message
        );

    }

}

createCustomerCareTable();



/* =========================================
   GMAIL SMTP
========================================= */

const transporter =
    nodemailer.createTransport({

        host: "smtp.gmail.com",

        port: 465,

        secure: true,

        auth: {

            user: process.env.EMAIL_USER,

            pass: process.env.EMAIL_PASSWORD

        },

        connectionTimeout: 30000,

        greetingTimeout: 30000,

        socketTimeout: 30000

    });

/* =========================================
   TEST SMTP
========================================= */

transporter.verify()

    .then(() => {

        console.log("---------------------------------");
        console.log(
            "Gmail SMTP connection successful."
        );
        console.log("---------------------------------");

    })

    .catch((error) => {

        console.error("---------------------------------");
        console.error(
            "Gmail SMTP connection FAILED."
        );
        console.error(
            "Message:",
            error.message
        );
        console.error("---------------------------------");

    });


/* =========================================
   MIDDLEWARE
========================================= */

app.use(express.json());

app.use(
    express.urlencoded({
        extended: true
    })
);


/* =========================================
   SESSION
========================================= */

app.use(

    session({

        secret:
            process.env.SESSION_SECRET ||
            "ned_hub_secret_2026",

        resave: false,

        saveUninitialized: false,

        cookie: {

            secure: false,

            httpOnly: true,

            maxAge:
                1000 *
                60 *
                60 *
                24

        }

    })

);


/* =========================================
   STATIC FILES
========================================= */

app.use(
    express.static(
        path.join(__dirname, "public")
    )
);

// ========================================
// ADMIN PAGE AUTHENTICATION
// ========================================


function requireAdminPage(req, res, next) {

    // Allow the login page without authentication
    if (req.path === "/login.html") {
        return next();
    }

    // Check admin session
    if (!req.session.admin) {
        return res.redirect("/admin/login.html");
    }

    next();
}


// ========================================
// ADMIN PAGE AUTHENTICATION
// ========================================

function requireAdminPage(req, res, next) {

    // Login page is accessible without login
    if (req.path === "/login.html") {
        return next();
    }

    // Everything else requires admin login
    if (!req.session.admin) {
        return res.redirect("/admin/login.html");
    }

    next();
}

app.use(
    "/admin",
    requireAdminPage,
    express.static(path.join(__dirname, "admin"))
);


app.use(
    "/uploads",
    express.static(
        path.join(__dirname, "uploads")
    )
);


/* =========================================
   TEST API
========================================= */

app.get("/api/test", (req, res) => {

    res.json({

        success: true,

        message:
            "NED HUB backend is working!"

    });

});


/* =========================================
   DATABASE TEST
========================================= */

app.get(
    "/api/database-test",
    async (req, res) => {

        try {

            const [rows] =
                await db.query(
                    "SELECT 1 AS connected"
                );

            res.json({

                success: true,

                message:
                    "NED HUB is successfully connected to MySQL.",

                database:
                    process.env.DB_NAME,

                result:
                    rows

            });

        } catch (error) {

            console.error(
                "Database test error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Database connection failed.",

                error:
                    error.message

            });

        }

    }
);


/* =========================================
   TEST EMAIL
========================================= */

app.get(
    "/api/test-email",
    async (req, res) => {

        try {

            const info =
                await transporter.sendMail({

                    from:
                        `"NED HUB" <${process.env.EMAIL_USER}>`,

                    to:
                        process.env.EMAIL_USER,

                    subject:
                        "NED HUB Email Test",

                    text:
                        "This is a test email from NED HUB."

                });

            res.json({

                success: true,

                message:
                    "Test email sent successfully.",

                messageId:
                    info.messageId

            });

        } catch (error) {

            console.error(
                "TEST EMAIL FAILED:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Email test failed.",

                error:
                    error.message

            });

        }

    }
);


/* =========================================
   CUSTOMER REGISTRATION
========================================= */

app.post(
    "/api/register",
    async (req, res) => {

        try {

            const {
                name,
                email,
                phone,
                password
            } = req.body;

            if (
                !name ||
                !email ||
                !password
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Name, email and password are required."

                });

            }

            if (password.length < 6) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Password must be at least 6 characters."

                });

            }

            const [
                existingCustomer
            ] = await db.query(

                `SELECT id
                 FROM customers
                 WHERE email = ?`,

                [email.trim()]

            );

            if (
                existingCustomer.length > 0
            ) {

                return res.status(409).json({

                    success: false,

                    message:
                        "An account with this email already exists."

                });

            }

            const verificationCode =
                Math.floor(
                    100000 +
                    Math.random() * 900000
                ).toString();

            const verificationExpires =
                new Date(
                    Date.now() +
                    10 * 60 * 1000
                );

            const hashedPassword =
                await bcrypt.hash(
                    password,
                    10
                );

            const [
                result
            ] = await db.query(

                `INSERT INTO customers
                (
                    name,
                    email,
                    phone,
                    password,
                    email_verified,
                    verification_code,
                    verification_expires
                )
                VALUES (?, ?, ?, ?, FALSE, ?, ?)`,

                [

                    name.trim(),

                    email.trim(),

                    phone
                        ? phone.trim()
                        : null,

                    hashedPassword,

                    verificationCode,

                    verificationExpires

                ]

            );

            await transporter.sendMail({

                from:
                    `"NED HUB" <${process.env.EMAIL_USER}>`,

                to:
                    email.trim(),

                subject:
                    "Verify your NED HUB account",

                html: `

                    <div style="
                        font-family:Arial,sans-serif;
                        max-width:600px;
                        margin:auto;
                        padding:30px;
                    ">

                        <h1 style="color:#1479ff;">
                            NED HUB
                        </h1>

                        <h2>
                            Verify your email address
                        </h2>

                        <p>
                            Hello
                            <strong>${name}</strong>,
                        </p>

                        <p>
                            Thank you for creating
                            your NED HUB account.
                        </p>

                        <p>
                            Your verification code is:
                        </p>

                        <div style="
                            background:#f1f5f9;
                            padding:20px;
                            text-align:center;
                            border-radius:8px;
                            margin:25px 0;
                        ">

                            <span style="
                                font-size:32px;
                                font-weight:bold;
                                letter-spacing:8px;
                                color:#1479ff;
                            ">
                                ${verificationCode}
                            </span>

                        </div>

                        <p>
                            This code expires in
                            <strong>10 minutes</strong>.
                        </p>

                        <p>
                            If you did not create
                            this account, ignore this email.
                        </p>

                        <hr>

                        <p style="
                            color:#777;
                            font-size:12px;
                        ">
                            © ${new Date().getFullYear()}
                            NED HUB.
                            All rights reserved.
                        </p>

                    </div>

                `

            });

            res.status(201).json({

                success: true,

                message:
                    "Account created. A verification code has been sent to your email.",

                customerId:
                    result.insertId

            });

        } catch (error) {

            console.error(
                "Registration error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Account was created, but we could not send the verification email. Please try again."

            });

        }

    }
);


/* =========================================
   VERIFY EMAIL
========================================= */

app.post(
    "/api/verify-email",
    async (req, res) => {

        try {

            const {
                email,
                code
            } = req.body;

            if (
                !email ||
                !code
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Email and verification code are required."

                });

            }

            const [
                customers
            ] = await db.query(

                `SELECT
                    id,
                    verification_code,
                    verification_expires,
                    email_verified
                 FROM customers
                 WHERE email = ?`,

                [email.trim()]

            );

            if (
                customers.length === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Customer account not found."

                });

            }

            const customer =
                customers[0];

            if (
                customer.email_verified
            ) {

                return res.json({

                    success: true,

                    message:
                        "Email is already verified."

                });

            }

            if (
                !customer.verification_code
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "No verification code is available."

                });

            }

            if (
                new Date() >
                new Date(
                    customer.verification_expires
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Verification code has expired."

                });

            }

            if (
                code.toString().trim() !==
                customer.verification_code
                    .toString()
                    .trim()
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Incorrect verification code."

                });

            }

            await db.query(

                `UPDATE customers
                 SET
                    email_verified = TRUE,
                    verification_code = NULL,
                    verification_expires = NULL
                 WHERE id = ?`,

                [customer.id]

            );

            res.json({

                success: true,

                message:
                    "Email verified successfully."

            });

        } catch (error) {

            console.error(
                "Verification error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Something went wrong while verifying your email."

            });

        }

    }
);


/* =========================================
   LOGIN
========================================= */

app.post(
    "/api/login",
    async (req, res) => {

        try {

            const {
                email,
                password
            } = req.body;

            if (
                !email ||
                !password
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Email and password are required."

                });

            }

            const [
                customers
            ] = await db.query(

                `SELECT
                    id,
                    name,
                    email,
                    phone,
                    password,
                    email_verified
                 FROM customers
                 WHERE email = ?`,

                [email.trim()]

            );

            if (
                customers.length === 0
            ) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Invalid email or password."

                });

            }

            const customer =
                customers[0];

            if (
                !customer.email_verified
            ) {

                return res.status(403).json({

                    success: false,

                    message:
                        "Your email address has not been verified.",

                    emailVerified:
                        false,

                    email:
                        customer.email

                });

            }

            const passwordMatch =
                await bcrypt.compare(
                    password,
                    customer.password
                );

            if (!passwordMatch) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Invalid email or password."

                });

            }

            req.session.customerId =
                customer.id;

            req.session.customerName =
                customer.name;

            req.session.customerEmail =
                customer.email;

            res.json({

                success: true,

                message:
                    `Welcome back, ${customer.name}!`,

                customer: {

                    id:
                        customer.id,

                    name:
                        customer.name,

                    email:
                        customer.email,

                    phone:
                        customer.phone

                }

            });

        } catch (error) {

            console.error(
                "Login error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Something went wrong while logging in."

            });

        }

    }
);

// ============================================================
// NED HUB - FORGOT PASSWORD
// ============================================================

const crypto = require("crypto");

// REQUEST PASSWORD RESET
app.post("/api/forgot-password", async (req, res) => {
    try {
        const email =
            typeof req.body.email === "string"
                ? req.body.email.trim().toLowerCase()
                : "";

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email address is required."
            });
        }

        const [customers] = await db.query(
            `
            SELECT id, name, email
            FROM customers
            WHERE LOWER(email) = ?
            LIMIT 1
            `,
            [email]
        );

        // Always give the same response so people cannot discover
        // whether an email belongs to a NED HUB account.
        if (customers.length === 0) {
            return res.json({
                success: true,
                message:
                    "If an account exists with that email, a password reset link has been sent."
            });
        }

        const customer = customers[0];

        // Generate secure random token
        const resetToken = crypto.randomBytes(32).toString("hex");

        // Token expires in 30 minutes
        const resetExpires = new Date(
            Date.now() + 30 * 60 * 1000
        );

        await db.query(
            `
            UPDATE customers
            SET reset_token = ?,
                reset_expires = ?
            WHERE id = ?
            `,
            [
                resetToken,
                resetExpires,
                customer.id
            ]
        );

        const resetLink =
    `http://127.0.0.1:3000/reset-password.html?token=${resetToken}`;

        await transporter.sendMail({
            from: `"NED HUB" <${process.env.EMAIL_USER}>`,
            to: customer.email,
            subject: "NED HUB - Password Reset",
            html: `
                <div style="
                    font-family:Arial,sans-serif;
                    max-width:600px;
                    margin:auto;
                    padding:30px;
                    border:1px solid #ddd;
                    border-radius:12px;
                ">

                    <h1 style="color:#0080ff;">
                        NED HUB
                    </h1>

                    <h2>Password Reset Request</h2>

                    <p>Hello ${customer.name},</p>

                    <p>
                        We received a request to reset the password
                        for your NED HUB account.
                    </p>

                    <p>
                        Click the button below to create a new password.
                    </p>

                    <p style="text-align:center;margin:30px 0;">
                        <a
                            href="${resetLink}"
                            style="
                                display:inline-block;
                                background:#0080ff;
                                color:white;
                                padding:14px 25px;
                                text-decoration:none;
                                border-radius:8px;
                                font-weight:bold;
                            "
                        >
                            Reset Password
                        </a>
                    </p>

                    <p>
                        This link will expire in
                        <strong>30 minutes</strong>.
                    </p>

                    <p>
                        If you did not request a password reset,
                        you can safely ignore this email.
                    </p>

                    <hr>

                    <p style="color:#777;font-size:13px;">
                        NED HUB — Your trusted online shop.
                    </p>

                </div>
            `
        });

        res.json({
            success: true,
            message:
                "If an account exists with that email, a password reset link has been sent."
        });

    } catch (error) {
        console.error("Forgot password error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to process password reset request."
        });
    }
});


// RESET PASSWORD
app.post("/api/reset-password", async (req, res) => {
    try {
        const {
            token,
            password
        } = req.body;

        if (!token || !password) {
            return res.status(400).json({
                success: false,
                message: "Reset token and new password are required."
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message:
                    "Password must be at least 8 characters."
            });
        }

        const [customers] = await db.query(
            `
            SELECT id
            FROM customers
            WHERE reset_token = ?
              AND reset_expires IS NOT NULL
              AND reset_expires > NOW()
            LIMIT 1
            `,
            [token]
        );

        if (customers.length === 0) {
            return res.status(400).json({
                success: false,
                message:
                    "This password reset link is invalid or has expired."
            });
        }

        const customerId = customers[0].id;

        const hashedPassword =
            await bcrypt.hash(password, 12);

        await db.query(
            `
            UPDATE customers
            SET password = ?,
                reset_token = NULL,
                reset_expires = NULL
            WHERE id = ?
            `,
            [
                hashedPassword,
                customerId
            ]
        );

        res.json({
            success: true,
            message:
                "Your password has been reset successfully. You can now log in."
        });

    } catch (error) {
        console.error("Reset password error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to reset password."
        });
    }
});




/* =========================================
   CUSTOMER ACCOUNT
========================================= */

app.get(
    "/api/account",
    async (req, res) => {

        try {

            if (!req.session.customerId) {

                return res.status(401).json({

                    success: false,

                    message:
                        "You are not logged in."

                });

            }

            const [
                customers
            ] = await db.query(

                `SELECT
                    id,
                    name,
                    email,
                    phone
                 FROM customers
                 WHERE id = ?`,

                [req.session.customerId]

            );

            if (
                customers.length === 0
            ) {

                req.session.destroy();

                return res.status(404).json({

                    success: false,

                    message:
                        "Customer account not found."

                });

            }

            res.json({

                success: true,

                customer:
                    customers[0]

            });

        } catch (error) {

            console.error(
                "Account error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Unable to load account."

            });

        }

    }
);


/* =========================================
   LOGOUT
========================================= */

app.post(
    "/api/logout",
    (req, res) => {

        req.session.destroy(
            (error) => {

                if (error) {

                    return res.status(500).json({

                        success: false,

                        message:
                            "Logout failed."

                    });

                }

                res.json({

                    success: true,

                    message:
                        "Logged out successfully."

                });

            }
        );

    }
);


/* =========================================
   UPDATE PROFILE
========================================= */

app.put(
    "/api/account/update",
    async (req, res) => {

        try {

            if (!req.session.customerId) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Please login first."

                });

            }

            const customerId =
                req.session.customerId;

            const {
                name,
                phone
            } = req.body;

            if (
                !name ||
                !name.trim()
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Full name is required."

                });

            }

            await db.query(

                `UPDATE customers
                 SET
                    name = ?,
                    phone = ?
                 WHERE id = ?`,

                [

                    name.trim(),

                    phone
                        ? phone.trim()
                        : null,

                    customerId

                ]

            );

            req.session.customerName =
                name.trim();

            res.json({

                success: true,

                message:
                    "Profile updated successfully."

            });

        } catch (error) {

            console.error(
                "Update profile error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Failed to update your profile."

            });

        }

    }
);


/* =========================================
   RESEND VERIFICATION
========================================= */

app.post(
    "/api/resend-verification",
    async (req, res) => {

        try {

            const {
                email
            } = req.body;

            if (!email) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Email address is required."

                });

            }

            const [
                customers
            ] = await db.query(

                `SELECT
                    id,
                    name,
                    email,
                    email_verified
                 FROM customers
                 WHERE email = ?`,

                [email.trim()]

            );

            if (
                customers.length === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "No account was found with this email address."

                });

            }

            const customer =
                customers[0];

            if (
                customer.email_verified
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "This email is already verified. You can login."

                });

            }

            const verificationCode =
                Math.floor(
                    100000 +
                    Math.random() * 900000
                ).toString();

            const expiresAt =
                new Date(
                    Date.now() +
                    15 * 60 * 1000
                );

            await db.query(

                `UPDATE customers
                 SET
                    verification_code = ?,
                    verification_expires = ?
                 WHERE id = ?`,

                [

                    verificationCode,

                    expiresAt,

                    customer.id

                ]

            );

            await transporter.sendMail({

                from:
                    `"NED HUB" <${process.env.EMAIL_USER}>`,

                to:
                    customer.email,

                subject:
                    "NED HUB - Verify Your Email",

                html: `

                    <div style="
                        font-family:Arial,sans-serif;
                        max-width:600px;
                        margin:auto;
                        padding:30px;
                    ">

                        <h2 style="color:#1479ff;">
                            NED HUB Email Verification
                        </h2>

                        <p>
                            Hello ${customer.name},
                        </p>

                        <p>
                            Here is your new verification code:
                        </p>

                        <div style="
                            background:#f4f7fb;
                            padding:20px;
                            text-align:center;
                            margin:25px 0;
                            border-radius:10px;
                        ">

                            <h1 style="
                                letter-spacing:8px;
                                color:#1479ff;
                            ">
                                ${verificationCode}
                            </h1>

                        </div>

                        <p>
                            This code expires in
                            <strong>15 minutes</strong>.
                        </p>

                        <p>
                            Thank you,<br>
                            <strong>NED HUB</strong>
                        </p>

                    </div>

                `

            });

            res.json({

                success: true,

                message:
                    "A new verification code has been sent to your email."

            });

        } catch (error) {

            console.error(
                "Resend verification error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Could not send the verification email."

            });

        }

    }
);


/* =========================================================
   NED HUB - PRODUCT MANAGEMENT
   ========================================================= */


/* =========================================================
   MULTER PRODUCT IMAGE UPLOAD
   ========================================================= */

const storage = multer.diskStorage({

    destination: function (req, file, cb) {

        cb(
            null,
            path.join(__dirname, "uploads")
        );

    },

    filename: function (req, file, cb) {

        const extension =
            path.extname(file.originalname);

        const filename =
            "product-" +
            Date.now() +
            "-" +
            Math.round(Math.random() * 1E9) +
            extension;

        cb(
            null,
            filename
        );

    }

});


const upload = multer({

    storage: storage,

    limits: {

        fileSize:
            5 * 1024 * 1024

    },

    fileFilter: function (req, file, cb) {

        const allowedTypes = [

            "image/jpeg",

            "image/png",

            "image/webp",

            "image/gif"

        ];


        if (
            allowedTypes.includes(
                file.mimetype
            )
        ) {

            cb(
                null,
                true
            );

        } else {

            cb(
                new Error(
                    "Only JPG, PNG, WEBP and GIF images are allowed."
                )
            );

        }

    }

});



// ==========================================
// WEBSITE SECTION IMAGE UPLOAD
// ==========================================

app.post(
    "/api/admin/website-sections/upload-image",
    requireAdminAPI,
    upload.single("sectionImage"),
    async (req, res) => {

        try {

            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: "No image was uploaded."
                });
            }

            const imagePath =
                "/uploads/" + req.file.filename;

            res.json({
                success: true,
                message: "Section image uploaded successfully.",
                image: imagePath
            });

        } catch (error) {

            console.error(
                "Section image upload error:",
                error
            );

            res.status(500).json({
                success: false,
                message: "Failed to upload section image."
            });

        }

    }
);





/* =========================================================
   UPLOAD SINGLE PRODUCT IMAGE
   Used for the main product image
   ========================================================= */

app.post(
    "/api/products/upload-image",
    upload.single("image"),
    (req, res) => {

        try {

            if (!req.file) {

                return res.status(400).json({

                    success: false,

                    message:
                        "No image uploaded."

                });

            }


            const imageUrl =
                "/uploads/" +
                req.file.filename;


            res.json({

                success: true,

                message:
                    "Image uploaded successfully.",

                imageUrl:
                    imageUrl

            });

        } catch (error) {

            console.error(
                "Image upload error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Image upload failed."

            });

        }

    }
);


/* =========================================================
   GET ALL PRODUCTS
   Includes all additional product images
   ========================================================= */

app.get(
    "/api/products",
    async (req, res) => {

        try {

            const [
                products
            ] = await db.query(`

                SELECT

                    p.id,

                    p.category_id,

                    p.name,

                    p.description,

                    p.price,

                    p.stock,

                    p.sku,

                    p.main_image,

                    p.status,

                    p.featured,

                    p.created_at,

                    p.updated_at,

                    c.name AS category_name

                FROM products p

                LEFT JOIN categories c
                    ON p.category_id = c.id

                ORDER BY p.id DESC

            `);


            /*
             * Load all additional images
             * belonging to each product.
             */

            for (
                const product
                of products
            ) {

                const [
                    images
                ] = await db.query(`

                    SELECT

                        id,

                        product_id,

                        image_url,

                        created_at

                    FROM product_images

                    WHERE product_id = ?

                    ORDER BY id ASC

                `, [

                    product.id

                ]);


                product.images =
                    images;

            }


            res.json({

                success: true,

                products

            });

        } catch (error) {

            console.error(
                "Get products error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Failed to load products."

            });

        }

    }
);


/* =========================================================
   ADD PRODUCT
   ========================================================= */

app.post(
    "/api/products",
    async (req, res) => {

        try {

            const {

                category_id,

                name,

                description,

                price,

                stock,

                sku,

                main_image,

                status,

                featured

            } = req.body;


            if (
                !name ||
                price === undefined ||
                price === ""
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Product name and price are required."

                });

            }


            const [
                result
            ] = await db.query(`

                INSERT INTO products

                (
                    category_id,
                    name,
                    description,
                    price,
                    stock,
                    sku,
                    main_image,
                    status,
                    featured
                )

                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)

            `, [

                category_id ||
                    null,

                name.trim(),

                description ||
                    null,

                Number(price),

                Number(stock) ||
                    0,

                sku ||
                    null,

                main_image ||
                    null,

                status ||
                    "active",

                featured
                    ? 1
                    : 0

            ]);


            res.json({

                success: true,

                message:
                    "Product added successfully.",

                productId:
                    result.insertId

            });

        } catch (error) {

            console.error(
                "Add product error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Failed to add product."

            });

        }

    }
);


/* =========================================================
   UPDATE PRODUCT
   ========================================================= */

app.put(
    "/api/products/:id",
    async (req, res) => {

        try {

            const id =
                Number(req.params.id);


            const {

                category_id,

                name,

                description,

                price,

                stock,

                sku,

                main_image,

                status,

                featured

            } = req.body;


            if (
                !Number.isInteger(id) ||
                id <= 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid product ID."

                });

            }


            if (
                !name ||
                price === undefined ||
                price === ""
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Product name and price are required."

                });

            }


            const [
                result
            ] = await db.query(`

                UPDATE products

                SET

                    category_id = ?,

                    name = ?,

                    description = ?,

                    price = ?,

                    stock = ?,

                    sku = ?,

                    main_image = ?,

                    status = ?,

                    featured = ?

                WHERE id = ?

            `, [

                category_id ||
                    null,

                name.trim(),

                description ||
                    null,

                Number(price),

                Number(stock) ||
                    0,

                sku ||
                    null,

                main_image ||
                    null,

                status ||
                    "active",

                featured
                    ? 1
                    : 0,

                id

            ]);


            if (
                result.affectedRows === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Product not found."

                });

            }


            res.json({

                success: true,

                message:
                    "Product updated successfully."

            });

        } catch (error) {

            console.error(
                "Update product error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Failed to update product."

            });

        }

    }
);


/* =========================================================
   DELETE PRODUCT
   Also removes its product_images records
   ========================================================= */

app.delete(
    "/api/products/:id",
    async (req, res) => {

        try {

            const id =
                Number(req.params.id);


            if (
                !Number.isInteger(id) ||
                id <= 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid product ID."

                });

            }


            /*
             * Check whether product exists.
             */

            const [
                products
            ] = await db.query(`

                SELECT id

                FROM products

                WHERE id = ?

                LIMIT 1

            `, [

                id

            ]);


            if (
                products.length === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Product not found."

                });

            }


            /*
             * Remove additional image records first.
             */

            await db.query(`

                DELETE FROM product_images

                WHERE product_id = ?

            `, [

                id

            ]);


            /*
             * Remove product.
             */

            await db.query(`

                DELETE FROM products

                WHERE id = ?

            `, [

                id

            ]);


            res.json({

                success: true,

                message:
                    "Product deleted successfully."

            });

        } catch (error) {

            console.error(
                "Delete product error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Failed to delete product."

            });

        }

    }
);


/* =========================================================
   GET IMAGES FOR ONE PRODUCT
   ========================================================= */

app.get(
    "/api/products/:id/images",
    async (req, res) => {

        try {

            const productId =
                Number(req.params.id);


            if (
                !Number.isInteger(productId) ||
                productId <= 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid product ID."

                });

            }


            const [
                images
            ] = await db.query(`

                SELECT

                    id,

                    product_id,

                    image_url,

                    created_at

                FROM product_images

                WHERE product_id = ?

                ORDER BY id ASC

            `, [

                productId

            ]);


            res.json({

                success: true,

                images

            });

        } catch (error) {

            console.error(
                "Get product images error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Failed to load product images."

            });

        }

    }
);


/* =========================================================
   UPLOAD MULTIPLE PRODUCT IMAGES
   Maximum: 10 images per request
   ========================================================= */

app.post(
    "/api/products/:id/images",
    upload.array("images", 10),
    async (req, res) => {

        try {

            const productId =
                Number(req.params.id);


            if (
                !Number.isInteger(productId) ||
                productId <= 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid product ID."

                });

            }


            if (
                !req.files ||
                req.files.length === 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "No images uploaded."

                });

            }


            /*
             * Make sure product exists.
             */

            const [
                products
            ] = await db.query(`

                SELECT id

                FROM products

                WHERE id = ?

                LIMIT 1

            `, [

                productId

            ]);


            if (
                products.length === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Product not found."

                });

            }


            const savedImages = [];


            /*
             * Save every uploaded image
             * into product_images.
             */

            for (
                const file
                of req.files
            ) {

                const imageUrl =
                    "/uploads/" +
                    file.filename;


                const [
                    result
                ] = await db.query(`

                    INSERT INTO product_images

                    (
                        product_id,
                        image_url
                    )

                    VALUES (?, ?)

                `, [

                    productId,

                    imageUrl

                ]);


                savedImages.push({

                    id:
                        result.insertId,

                    product_id:
                        productId,

                    image_url:
                        imageUrl

                });

            }


            /*
             * If the product currently has
             * no main image, automatically
             * use the first uploaded image.
             */

            const [
                currentProduct
            ] = await db.query(`

                SELECT main_image

                FROM products

                WHERE id = ?

                LIMIT 1

            `, [

                productId

            ]);


            if (
                currentProduct.length > 0 &&
                !currentProduct[0].main_image &&
                savedImages.length > 0
            ) {

                await db.query(`

                    UPDATE products

                    SET main_image = ?

                    WHERE id = ?

                `, [

                    savedImages[0].image_url,

                    productId

                ]);

            }


            res.json({

                success: true,

                message:
                    `${savedImages.length} image(s) uploaded successfully.`,

                images:
                    savedImages

            });

        } catch (error) {

            console.error(
                "Multiple product image upload error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Failed to upload product images."

            });

        }

    }
);


/* =========================================================
   DELETE ONE PRODUCT IMAGE
   ========================================================= */

app.delete(
    "/api/products/:productId/images/:imageId",
    async (req, res) => {

        try {

            const productId =
                Number(req.params.productId);

            const imageId =
                Number(req.params.imageId);


            if (
                !Number.isInteger(productId) ||
                productId <= 0 ||
                !Number.isInteger(imageId) ||
                imageId <= 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid product or image ID."

                });

            }


            /*
             * Find the image first.
             */

            const [
                images
            ] = await db.query(`

                SELECT

                    id,

                    image_url

                FROM product_images

                WHERE id = ?

                AND product_id = ?

                LIMIT 1

            `, [

                imageId,

                productId

            ]);


            if (
                images.length === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Product image not found."

                });

            }


            /*
             * Delete image record.
             */

            await db.query(`

                DELETE FROM product_images

                WHERE id = ?

                AND product_id = ?

            `, [

                imageId,

                productId

            ]);


            /*
             * If deleted image was the
             * main image, choose another
             * available image automatically.
             */

            const [
                product
            ] = await db.query(`

                SELECT
                    main_image

                FROM products

                WHERE id = ?

                LIMIT 1

            `, [

                productId

            ]);


            if (
                product.length > 0 &&
                product[0].main_image ===
                    images[0].image_url
            ) {

                const [
                    remainingImages
                ] = await db.query(`

                    SELECT
                        image_url

                    FROM product_images

                    WHERE product_id = ?

                    ORDER BY id ASC

                    LIMIT 1

                `, [

                    productId

                ]);


                const newMainImage =
                    remainingImages.length > 0
                        ? remainingImages[0].image_url
                        : null;


                await db.query(`

                    UPDATE products

                    SET main_image = ?

                    WHERE id = ?

                `, [

                    newMainImage,

                    productId

                ]);

            }


            res.json({

                success: true,

                message:
                    "Product image deleted successfully."

            });

        } catch (error) {

            console.error(
                "Delete product image error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Failed to delete product image."

            });

        }

    }
);


/* =========================================================
   SET AN IMAGE AS MAIN PRODUCT IMAGE
   ========================================================= */

app.put(
    "/api/products/:productId/images/:imageId/main",
    async (req, res) => {

        try {

            const productId =
                Number(req.params.productId);

            const imageId =
                Number(req.params.imageId);


            if (
                !Number.isInteger(productId) ||
                productId <= 0 ||
                !Number.isInteger(imageId) ||
                imageId <= 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid product or image ID."

                });

            }


            /*
             * Make sure image belongs
             * to this product.
             */

            const [
                images
            ] = await db.query(`

                SELECT

                    image_url

                FROM product_images

                WHERE id = ?

                AND product_id = ?

                LIMIT 1

            `, [

                imageId,

                productId

            ]);


            if (
                images.length === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Product image not found."

                });

            }


            /*
             * Update products.main_image
             */

            await db.query(`

                UPDATE products

                SET main_image = ?

                WHERE id = ?

            `, [

                images[0].image_url,

                productId

            ]);


            res.json({

                success: true,

                message:
                    "Main product image updated successfully.",

                mainImage:
                    images[0].image_url

            });

        } catch (error) {

            console.error(
                "Set main product image error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Failed to set main product image."

            });

        }

    }
);




// ============================================================
// NED HUB - CATEGORY API
// ============================================================


// ============================================================
// GET ALL CATEGORIES
// ============================================================

app.get("/api/categories", async (req, res) => {

    try {

        const [categories] = await db.query(`
            SELECT
                c.id,
                c.name,
                COUNT(p.id) AS product_count
            FROM categories c
            LEFT JOIN products p
                ON p.category_id = c.id
            GROUP BY
                c.id,
                c.name
            ORDER BY
                c.name ASC
        `);


        res.json({

            success: true,

            categories

        });


    } catch (error) {

        console.error(
            "GET CATEGORIES ERROR:",
            error
        );


        res.status(500).json({

            success: false,

            message:
                "Failed to load categories."

        });

    }

});


// ============================================================
// ADD CATEGORY
// ============================================================

app.post("/api/categories", async (req, res) => {

    try {

        const name =
            typeof req.body.name === "string"
                ? req.body.name.trim()
                : "";


        if (!name) {

            return res.status(400).json({

                success: false,

                message:
                    "Category name is required."

            });

        }


        // Check duplicate

        const [existing] =
            await db.query(
                `
                SELECT id
                FROM categories
                WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))
                LIMIT 1
                `,
                [name]
            );


        if (existing.length > 0) {

            return res.status(409).json({

                success: false,

                message:
                    "This category already exists."

            });

        }


        // Insert

        const [result] =
            await db.query(
                `
                INSERT INTO categories
                (name)
                VALUES (?)
                `,
                [name]
            );


        res.status(201).json({

            success: true,

            message:
                "Category added successfully.",

            category: {

                id: result.insertId,

                name: name,

                product_count: 0

            }

        });


    } catch (error) {

        console.error(
            "ADD CATEGORY ERROR:",
            error
        );


        res.status(500).json({

            success: false,

            message:
                "Failed to add category."

        });

    }

});


// ============================================================
// UPDATE CATEGORY
// ============================================================

app.put("/api/categories/:id", async (req, res) => {

    try {

        const id =
            Number(req.params.id);


        const name =
            typeof req.body.name === "string"
                ? req.body.name.trim()
                : "";


        if (!Number.isInteger(id) || id <= 0) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid category ID."

            });

        }


        if (!name) {

            return res.status(400).json({

                success: false,

                message:
                    "Category name is required."

            });

        }


        // Check category exists

        const [category] =
            await db.query(
                `
                SELECT id
                FROM categories
                WHERE id = ?
                LIMIT 1
                `,
                [id]
            );


        if (category.length === 0) {

            return res.status(404).json({

                success: false,

                message:
                    "Category not found."

            });

        }


        // Check duplicate name

        const [duplicate] =
            await db.query(
                `
                SELECT id
                FROM categories
                WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))
                AND id != ?
                LIMIT 1
                `,
                [name, id]
            );


        if (duplicate.length > 0) {

            return res.status(409).json({

                success: false,

                message:
                    "Another category already has this name."

            });

        }


        // Update

        await db.query(
            `
            UPDATE categories
            SET name = ?
            WHERE id = ?
            `,
            [name, id]
        );


        res.json({

            success: true,

            message:
                "Category updated successfully."

        });


    } catch (error) {

        console.error(
            "UPDATE CATEGORY ERROR:",
            error
        );


        res.status(500).json({

            success: false,

            message:
                "Failed to update category."

        });

    }

});


// ============================================================
// DELETE CATEGORY
// ============================================================

app.delete("/api/categories/:id", async (req, res) => {

    try {

        const id =
            Number(req.params.id);


        if (!Number.isInteger(id) || id <= 0) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid category ID."

            });

        }


        // Check category

        const [category] =
            await db.query(
                `
                SELECT id, name
                FROM categories
                WHERE id = ?
                LIMIT 1
                `,
                [id]
            );


        if (category.length === 0) {

            return res.status(404).json({

                success: false,

                message:
                    "Category not found."

            });

        }


        // Check products

        const [products] =
            await db.query(
                `
                SELECT COUNT(*) AS total
                FROM products
                WHERE category_id = ?
                `,
                [id]
            );


        const productCount =
            Number(products[0].total);


        if (productCount > 0) {

            return res.status(400).json({

                success: false,

                message:
                    `Cannot delete "${category[0].name}" because ${productCount} product(s) are using this category. Please assign those products to another category first.`

            });

        }


        // Delete

        await db.query(
            `
            DELETE FROM categories
            WHERE id = ?
            `,
            [id]
        );


        res.json({

            success: true,

            message:
                "Category deleted successfully."

        });


    } catch (error) {

        console.error(
            "DELETE CATEGORY ERROR:",
            error
        );


        res.status(500).json({

            success: false,

            message:
                "Failed to delete category."

        });

    }

});


/* =========================================
   CREATE CUSTOMER ORDER
   OLD PUBLIC ROUTE
========================================= */

/*
   This route is kept as a compatibility route.

   The main checkout page uses:
   /api/orders/create

   The old route has been updated to use
   the current database structure.
*/

app.post(
    "/api/orders",
    async (req, res) => {

        try {

            if (!req.session.customerId) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Please login before placing an order."

                });

            }

            const {
                delivery_address,
                delivery_city,
                delivery_region,
                items
            } = req.body;

            if (
                !delivery_address ||
                !delivery_city ||
                !delivery_region
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "All delivery details are required."

                });

            }

            if (
                !Array.isArray(items) ||
                items.length === 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Your cart is empty."

                });

            }

            req.body.delivery_address =
                delivery_address;

            req.body.city =
                delivery_city;

            req.body.region =
                delivery_region;

            /*
               Convert old item format into
               the current checkout format.
            */

            req.body.items =
                items.map(item => ({

                    product_id:
                        Number(
                            item.product_id ||
                            item.id
                        ),

                    quantity:
                        Number(
                            item.quantity
                        )

                }));

            return createOrderFromRequest(
                req,
                res
            );

        } catch (error) {

            console.error(
                "Old order route error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Failed to create order."

            });

        }

    }
);


/* =========================================
   SHARED ORDER CREATION FUNCTION
========================================= */

async function createOrderFromRequest(
    req,
    res
) {

    let connection;

    try {

        if (!req.session.customerId) {

            return res.status(401).json({

                success: false,

                message:
                    "Please login before placing an order."

            });

        }

        const customerId =
            req.session.customerId;

        const {
            items,
            delivery_address,
            city,
            region
        } = req.body;


        /* ---------------------------------
           VALIDATION
        --------------------------------- */

        if (
            !Array.isArray(items) ||
            items.length === 0
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Your cart is empty."

            });

        }

        if (
            !delivery_address ||
            !delivery_address.trim()
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Delivery address is required."

            });

        }

        if (
            !city ||
            !city.trim()
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Delivery city is required."

            });

        }

        if (
            !region ||
            !region.trim()
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Delivery region is required."

            });

        }


        /* ---------------------------------
           DATABASE CONNECTION
        --------------------------------- */

        connection =
            await db.getConnection();

        await connection.beginTransaction();


        /* ---------------------------------
           GET CUSTOMER
        --------------------------------- */

        const [
            customers
        ] = await connection.query(

            `SELECT
                id,
                name,
                email,
                phone
             FROM customers
             WHERE id = ?`,

            [customerId]

        );

        if (
            customers.length === 0
        ) {

            await connection.rollback();

            return res.status(404).json({

                success: false,

                message:
                    "Customer account not found."

            });

        }

        const customer =
            customers[0];


        /* ---------------------------------
           CHECK PRODUCTS
        --------------------------------- */

        let subtotal = 0;

        const orderItems = [];


        for (
            const item of items
        ) {

            const productId =
                Number(
                    item.product_id ||
                    item.productId ||
                    item.id
                );

            const quantity =
                Number(
                    item.quantity
                );


            if (
                !Number.isInteger(
                    productId
                ) ||
                productId <= 0
            ) {

                await connection.rollback();

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid product."

                });

            }


            if (
                !Number.isInteger(
                    quantity
                ) ||
                quantity <= 0
            ) {

                await connection.rollback();

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid product quantity."

                });

            }


            const [
                products
            ] = await connection.query(

                `SELECT
                    id,
                    name,
                    price,
                    stock,
                    status
                 FROM products
                 WHERE id = ?
                 FOR UPDATE`,

                [productId]

            );


            if (
                products.length === 0
            ) {

                await connection.rollback();

                return res.status(404).json({

                    success: false,

                    message:
                        `Product ${productId} was not found.`

                });

            }


            const product =
                products[0];


            if (
                product.status !==
                    "active" ||
                Number(product.stock) <= 0
            ) {

                await connection.rollback();

                return res.status(400).json({

                    success: false,

                    message:
                        `${product.name} is currently out of stock.`

                });

            }


            if (
                quantity >
                Number(product.stock)
            ) {

                await connection.rollback();

                return res.status(400).json({

                    success: false,

                    message:
                        `${product.name} only has ${product.stock} item(s) available.`

                });

            }


            const price =
                Number(
                    product.price
                );

            const itemTotal =
                price *
                quantity;


            subtotal +=
                itemTotal;


            orderItems.push({

                productId:
                    product.id,

                quantity:
                    quantity,

                price:
                    price

            });

        }


        /* ---------------------------------
           DELIVERY FEE
        --------------------------------- */

        const normalizedCity =
            city
                .trim()
                .toLowerCase();

        const normalizedRegion =
            region
                .trim()
                .toLowerCase();


        let deliveryFee = 40;


        /*
           ACCRA + GREATER ACCRA
           = FREE
        */

        if (

            normalizedCity ===
                "accra" &&

            normalizedRegion ===
                "greater accra"

        ) {

            deliveryFee = 0;

        }


        /*
           TEMA + GREATER ACCRA
           = GHS 20
        */

        else if (

            normalizedCity ===
                "tema" &&

            normalizedRegion ===
                "greater accra"

        ) {

            deliveryFee = 20;

        }


        /*
           OTHER GREATER ACCRA
           = GHS 25
        */

        else if (

            normalizedRegion ===
                "greater accra"

        ) {

            deliveryFee = 25;

        }


        /*
           OTHER REGIONS
           = GHS 40
        */


        const total =
            subtotal +
            deliveryFee;


        /* =================================
           CREATE ORDER
        ================================= */

        const [
            orderResult
        ] = await connection.query(

            `INSERT INTO orders
            (
                customer_id,
                total,
                delivery_fee,
                delivery_address,
                status,
                payment_status
            )
            VALUES (?, ?, ?, ?, ?, ?)`,

            [

                customerId,

                total.toFixed(2),

                deliveryFee.toFixed(2),

                delivery_address.trim(),

                "Pending",

                "Pending"

            ]

        );


        /*
           IMPORTANT:

           orderId MUST be created here
           BEFORE payment or order items
           use it.
        */

        const orderId =
            orderResult.insertId;


        /* =================================
           CREATE ORDER ITEMS
        ================================= */

        for (
            const item of orderItems
        ) {

            await connection.query(

                `INSERT INTO order_items
                (
                    order_id,
                    product_id,
                    quantity,
                    price
                )
                VALUES (?, ?, ?, ?)`,

                [

                    orderId,

                    item.productId,

                    item.quantity,

                    item.price.toFixed(2)

                ]

            );

        }


        /* =================================
           CREATE ONE PAYMENT RECORD
        ================================= */

        await connection.query(

            `INSERT INTO payments
            (
                order_id,
                reference,
                amount,
                method,
                status
            )
            VALUES (?, ?, ?, ?, ?)`,

            [

                orderId,

                null,

                total.toFixed(2),

                "Paystack",

                "Pending"

            ]

        );


        /* =================================
           COMMIT
        ================================= */

        await connection.commit();


        /* =================================
           SUCCESS
        ================================= */

        res.json({

            success: true,

            message:
                "Order created successfully.",

            orderId:
                orderId,

            amount:
                Number(
                    total.toFixed(2)
                ),

            subtotal:
                Number(
                    subtotal.toFixed(2)
                ),

            deliveryFee:
                Number(
                    deliveryFee.toFixed(2)
                ),

            customer: {

                name:
                    customer.name,

                email:
                    customer.email,

                phone:
                    customer.phone

            }

        });


    } catch (error) {

        if (connection) {

            try {

                await connection.rollback();

            } catch (rollbackError) {

                console.error(
                    "Rollback error:",
                    rollbackError
                );

            }

        }


        console.error(
            "Create order error:",
            error
        );


        res.status(500).json({

            success: false,

            message:
                error.message ||
                "Failed to create order."

        });


    } finally {

        if (connection) {

            connection.release();

        }

    }

}


/* =========================================
   MAIN CHECKOUT ORDER ROUTE
========================================= */

app.post(
    "/api/orders/create",
    async (req, res) => {

        await createOrderFromRequest(
            req,
            res
        );

    }
);


/* =========================================
   PAYSTACK INITIALIZE
========================================= */

app.post(
    "/api/payments/initialize",
    async (req, res) => {

        try {

            if (!req.session.customerId) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Please login before making payment."

                });

            }


            const {
                orderId
            } = req.body;


            if (!orderId) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Order ID is required."

                });

            }


            const [
                orders
            ] = await db.query(

                `SELECT
                    o.id,
                    o.customer_id,
                    o.total,
                    o.payment_status,
                    c.email,
                    c.name

                 FROM orders o

                 INNER JOIN customers c
                    ON o.customer_id = c.id

                 WHERE
                    o.id = ?
                    AND o.customer_id = ?`,

                [

                    orderId,

                    req.session.customerId

                ]

            );


            if (
                orders.length === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Order not found."

                });

            }


            const order =
                orders[0];


            if (
                order.payment_status ===
                "Paid"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "This order has already been paid."

                });

            }


            const amount =
                Number(
                    order.total
                );


            if (
                !amount ||
                amount <= 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid order amount."

                });

            }


            const amountInPesewas =
                Math.round(
                    amount * 100
                );


            const reference =
                "NEDHUB-" +
                order.id +
                "-" +
                Date.now();


            const paystackResponse =
                await fetch(

                    "https://api.paystack.co/transaction/initialize",

                    {

                        method:
                            "POST",

                        headers: {

                            "Authorization":
                                `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,

                            "Content-Type":
                                "application/json"

                        },

                        body:
                            JSON.stringify({

                                email:
                                    order.email,

                                amount:
                                    amountInPesewas,

                                currency:
                                    "GHS",

                                reference:
                                    reference,

                                callback_url:
                                    "http://localhost:3000/payment-success.html",

                                metadata: {

                                    order_id:
                                        order.id,

                                    customer_id:
                                        order.customer_id

                                }

                            })

                    }

                );


            const paystackData =
                await paystackResponse.json();


            console.log(
                "Paystack response:",
                paystackData
            );


            if (
                !paystackResponse.ok ||
                !paystackData.status
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        paystackData.message ||
                        "Paystack payment initialization failed."

                });

            }


            const authorizationUrl =
                paystackData.data
                    .authorization_url;


            const paystackReference =
                paystackData.data
                    .reference;


            await db.query(

                `UPDATE payments
                 SET
                    reference = ?,
                    amount = ?,
                    method = ?,
                    status = ?
                 WHERE order_id = ?`,

                [

                    paystackReference,

                    amount.toFixed(2),

                    "Paystack",

                    "Pending",

                    order.id

                ]

            );


            res.json({

                success: true,

                message:
                    "Payment initialized successfully.",

                authorization_url:
                    authorizationUrl,

                reference:
                    paystackReference,

                orderId:
                    order.id

            });


        } catch (error) {

            console.error(
                "Paystack initialization error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Could not initialize Paystack payment."

            });

        }

    }
);


/* =========================================
   VERIFY PAYSTACK PAYMENT
========================================= */

app.get(
    "/api/payments/verify/:reference",
    async (req, res) => {

        let connection;

        try {

            if (!req.session.customerId) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Please login."

                });

            }


            const {
                reference
            } = req.params;


            if (!reference) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Payment reference is required."

                });

            }


            const paystackResponse =
                await fetch(

                    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,

                    {

                        method:
                            "GET",

                        headers: {

                            "Authorization":
                                `Bearer ${process.env.PAYSTACK_SECRET_KEY}`

                        }

                    }

                );


            const paystackData =
                await paystackResponse.json();


            if (
                !paystackResponse.ok ||
                !paystackData.status ||
                !paystackData.data
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        paystackData.message ||
                        "Could not verify payment."

                });

            }


            const transaction =
                paystackData.data;


            if (
                transaction.status !==
                "success"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Payment was not successful.",

                    status:
                        transaction.status

                });

            }


            const [
                payments
            ] = await db.query(

                `SELECT

                    p.id,

                    p.order_id,

                    p.amount,

                    p.reference,

                    o.customer_id,

                    o.payment_status

                 FROM payments p

                 INNER JOIN orders o
                    ON p.order_id = o.id

                 WHERE p.reference = ?`,

                [reference]

            );


            if (
                payments.length === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Payment record not found."

                });

            }


            const payment =
                payments[0];


            if (
                Number(
                    payment.customer_id
                ) !==
                Number(
                    req.session.customerId
                )
            ) {

                return res.status(403).json({

                    success: false,

                    message:
                        "Unauthorized payment."

                });

            }


            if (
                payment.payment_status ===
                "Paid"
            ) {

                return res.json({

                    success: true,

                    message:
                        "Payment was already verified.",

                    orderId:
                        payment.order_id

                });

            }


            const expectedAmount =
                Math.round(
                    Number(
                        payment.amount
                    ) * 100
                );


            if (
                Number(
                    transaction.amount
                ) !==
                expectedAmount
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Payment amount does not match the order."

                });

            }


            connection =
                await db.getConnection();


            await connection.beginTransaction();


            /* ---------------------------------
               MARK PAYMENT PAID
            --------------------------------- */

            await connection.query(

                `UPDATE payments
                 SET
                    status = ?,
                    paid_at = NOW()
                 WHERE id = ?`,

                [

                    "Paid",

                    payment.id

                ]

            );


            /* ---------------------------------
               MARK ORDER PAID
            --------------------------------- */

            await connection.query(

                `UPDATE orders
                 SET
                    payment_status = ?,
                    status = ?
                 WHERE id = ?`,

                [

                    "Paid",

                    "Confirmed",

                    payment.order_id

                ]

            );


            /* ---------------------------------
               GET ORDER ITEMS
            --------------------------------- */

            const [
                items
            ] = await connection.query(

                `SELECT
                    product_id,
                    quantity
                 FROM order_items
                 WHERE order_id = ?`,

                [payment.order_id]

            );


            /* ---------------------------------
               REDUCE STOCK
            --------------------------------- */

            for (
                const item of items
            ) {

                const [
                    products
                ] = await connection.query(

                    `SELECT
                        id,
                        stock
                     FROM products
                     WHERE id = ?
                     FOR UPDATE`,

                    [item.product_id]

                );


                if (
                    products.length === 0
                ) {

                    throw new Error(
                        `Product ${item.product_id} not found.`
                    );

                }


                if (
                    Number(
                        products[0].stock
                    ) <
                    Number(
                        item.quantity
                    )
                ) {

                    throw new Error(
                        `Not enough stock for product ${item.product_id}.`
                    );

                }


                await connection.query(

                    `UPDATE products
                     SET
                        stock =
                            stock - ?
                     WHERE id = ?`,

                    [

                        item.quantity,

                        item.product_id

                    ]

                );

            }


            await connection.commit();


            res.json({

                success: true,

                message:
                    "Payment verified successfully.",

                orderId:
                    payment.order_id,

                reference:
                    reference

            });


        } catch (error) {

            if (connection) {

                try {

                    await connection.rollback();

                } catch (rollbackError) {

                    console.error(
                        "Rollback error:",
                        rollbackError
                    );

                }

            }


            console.error(
                "Payment verification error:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Payment verification failed."

            });


        } finally {

            if (connection) {

                connection.release();

            }

        }

    }
);


/* =========================================
   CUSTOMER ORDERS
========================================= */

app.get(
    "/api/my-orders",
    async (req, res) => {

        try {

            if (!req.session.customerId) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Please login first."

                });

            }


            const customerId =
                req.session.customerId;


            const [
                orders
            ] = await db.query(

                `SELECT

                    o.id,

                    o.total,

                    o.delivery_fee,

                    o.delivery_address,

                    o.status,

                    o.payment_status,

                    o.created_at,

                    o.updated_at

                 FROM orders o

                 WHERE o.customer_id = ?

                 ORDER BY
                    o.created_at DESC`,

                [customerId]

            );


            for (
                const order of orders
            ) {

                const [
                    items
                ] = await db.query(

                    `SELECT

                        oi.id,

                        oi.product_id,

                        oi.quantity,

                        oi.price,

                        p.name,

                        p.main_image

                     FROM order_items oi

                     LEFT JOIN products p
                        ON oi.product_id = p.id

                     WHERE
                        oi.order_id = ?

                     ORDER BY
                        oi.id ASC`,

                    [order.id]

                );


                order.items =
                    items;

            }


            res.json({

                success: true,

                orders

            });


        } catch (error) {

            console.error(
                "Get customer orders error:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Failed to load your orders."

            });

        }

    }
);


/* =========================================
   CUSTOMER ADDRESSES
========================================= */


/* GET ADDRESSES */

app.get(
    "/api/addresses",
    async (req, res) => {

        try {

            if (!req.session.customerId) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Please login first."

                });

            }


            const [
                addresses
            ] = await db.query(

                `SELECT

                    id,

                    full_name,

                    phone,

                    address,

                    city,

                    region,

                    country,

                    is_default,

                    created_at

                 FROM customer_addresses

                 WHERE customer_id = ?

                 ORDER BY
                    is_default DESC,
                    created_at DESC`,

                [req.session.customerId]

            );


            res.json({

                success: true,

                addresses

            });


        } catch (error) {

            console.error(
                "Get addresses error:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Failed to load addresses."

            });

        }

    }
);


/* ADD ADDRESS */

app.post(
    "/api/addresses",
    async (req, res) => {

        try {

            if (!req.session.customerId) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Please login first."

                });

            }


            const {
                full_name,
                phone,
                address,
                city,
                region
            } = req.body;


            if (
                !full_name ||
                !full_name.trim()
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Full name is required."

                });

            }


            if (
                !address ||
                !address.trim()
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Address is required."

                });

            }


            if (
                !city ||
                !city.trim()
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "City is required."

                });

            }


            if (
                !region ||
                !region.trim()
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Region is required."

                });

            }


            const [
                existingAddresses
            ] = await db.query(

                `SELECT id
                 FROM customer_addresses
                 WHERE customer_id = ?`,

                [req.session.customerId]

            );


            const isDefault =
                existingAddresses.length === 0
                    ? 1
                    : 0;


            await db.query(

                `INSERT INTO customer_addresses
                (
                    customer_id,
                    full_name,
                    phone,
                    address,
                    city,
                    region,
                    country,
                    is_default
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,

                [

                    req.session.customerId,

                    full_name.trim(),

                    phone
                        ? phone.trim()
                        : null,

                    address.trim(),

                    city.trim(),

                    region.trim(),

                    "Ghana",

                    isDefault

                ]

            );


            res.json({

                success: true,

                message:
                    "Address saved successfully."

            });


        } catch (error) {

            console.error(
                "Add address error:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Failed to save address."

            });

        }

    }
);


/* SET DEFAULT ADDRESS */

app.put(
    "/api/addresses/:id/default",
    async (req, res) => {

        let connection;

        try {

            if (!req.session.customerId) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Please login first."

                });

            }


            const addressId =
                Number(
                    req.params.id
                );


            if (
                !Number.isInteger(
                    addressId
                ) ||
                addressId <= 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid address."

                });

            }


            connection =
                await db.getConnection();


            await connection.beginTransaction();


            const [
                addresses
            ] = await connection.query(

                `SELECT id
                 FROM customer_addresses
                 WHERE id = ?
                 AND customer_id = ?`,

                [

                    addressId,

                    req.session.customerId

                ]

            );


            if (
                addresses.length === 0
            ) {

                await connection.rollback();

                return res.status(404).json({

                    success: false,

                    message:
                        "Address not found."

                });

            }


            await connection.query(

                `UPDATE customer_addresses
                 SET is_default = 0
                 WHERE customer_id = ?`,

                [req.session.customerId]

            );


            await connection.query(

                `UPDATE customer_addresses
                 SET is_default = 1
                 WHERE id = ?
                 AND customer_id = ?`,

                [

                    addressId,

                    req.session.customerId

                ]

            );


            await connection.commit();


            res.json({

                success: true,

                message:
                    "Default address updated."

            });


        } catch (error) {

            if (connection) {

                try {

                    await connection.rollback();

                } catch (rollbackError) {

                    console.error(
                        "Rollback error:",
                        rollbackError
                    );

                }

            }


            console.error(
                "Set default address error:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Failed to update default address."

            });


        } finally {

            if (connection) {

                connection.release();

            }

        }

    }
);


/* DELETE ADDRESS */

app.delete(
    "/api/addresses/:id",
    async (req, res) => {

        try {

            if (!req.session.customerId) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Please login first."

                });

            }


            const addressId =
                Number(
                    req.params.id
                );


            const [
                addresses
            ] = await db.query(

                `SELECT id
                 FROM customer_addresses
                 WHERE id = ?
                 AND customer_id = ?`,

                [

                    addressId,

                    req.session.customerId

                ]

            );


            if (
                addresses.length === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Address not found."

                });

            }


            await db.query(

                `DELETE FROM customer_addresses
                 WHERE id = ?
                 AND customer_id = ?`,

                [

                    addressId,

                    req.session.customerId

                ]

            );


            res.json({

                success: true,

                message:
                    "Address deleted successfully."

            });


        } catch (error) {

            console.error(
                "Delete address error:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Failed to delete address."

            });

        }

    }
);


/* =========================================
   ADMIN ORDERS
========================================= */

app.get(
    "/api/admin/orders",
    async (req, res) => {

        try {

            const [
                orders
            ] = await db.query(`

                SELECT

                    o.id,

                    o.customer_id,

                    o.total,

                    o.delivery_fee,

                    o.delivery_address,

                    o.status,

                    o.payment_status,

                    o.created_at,

                    o.updated_at,

                    c.name AS customer_name,

                    c.email AS customer_email,

                    c.phone AS customer_phone

                FROM orders o

                LEFT JOIN customers c
                    ON o.customer_id = c.id

                ORDER BY
                    o.created_at DESC

            `);


            for (
                const order of orders
            ) {

                const [
                    items
                ] = await db.query(`

                    SELECT

                        oi.id,

                        oi.product_id,

                        oi.quantity,

                        oi.price,

                        p.name,

                        p.main_image

                    FROM order_items oi

                    LEFT JOIN products p
                        ON oi.product_id = p.id

                    WHERE
                        oi.order_id = ?

                    ORDER BY
                        oi.id ASC

                `, [
                    order.id
                ]);


                order.items =
                    items;

            }


            res.json({

                success: true,

                orders

            });


        } catch (error) {

            console.error(
                "Admin orders error:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Failed to load admin orders."

            });

        }

    }
);


/* =========================================
   ADMIN UPDATE ORDER STATUS
========================================= */

app.put(
    "/api/admin/orders/:id/status",
    async (req, res) => {

        try {

            const orderId =
                Number(
                    req.params.id
                );

            const {
                status
            } = req.body;


            const allowedStatuses = [

                "Pending",

                "Confirmed",

                "Processing",

                "Ready",

                "Shipped",

                "Delivered",

                "Cancelled"

            ];


            if (
                !Number.isInteger(
                    orderId
                ) ||
                orderId <= 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid order ID."

                });

            }


            if (
                !allowedStatuses.includes(
                    status
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid order status."

                });

            }


            const [
                result
            ] = await db.query(

                `UPDATE orders
                 SET status = ?
                 WHERE id = ?`,

                [

                    status,

                    orderId

                ]

            );


            if (
                result.affectedRows === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Order not found."

                });

            }


            res.json({

                success: true,

                message:
                    "Order status updated successfully."

            });


        } catch (error) {

            console.error(
                "Update admin order status error:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Failed to update order status."

            });

        }

    }
);


/* =========================================
   ADMIN CUSTOMERS
========================================= */

app.get(
    "/api/admin/customers",
    async (req, res) => {

        try {

            const [
                customers
            ] = await db.query(`

                SELECT

                    c.id,

                    c.name,

                    c.email,

                    c.phone,

                    c.email_verified,

                    c.created_at,

                    COUNT(
                        DISTINCT o.id
                    ) AS order_count,

                    COALESCE(

                        SUM(

                            CASE

                                WHEN
                                    o.payment_status =
                                    'Paid'

                                THEN
                                    o.total

                                ELSE
                                    0

                            END

                        ),

                        0

                    ) AS total_spent

                FROM customers c

                LEFT JOIN orders o
                    ON c.id = o.customer_id

                GROUP BY

                    c.id,

                    c.name,

                    c.email,

                    c.phone,

                    c.email_verified,

                    c.created_at

                ORDER BY
                    c.created_at DESC

            `);


            res.json({

                success: true,

                customers

            });


        } catch (error) {

            console.error(
                "Admin customers error:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Failed to load customers."

            });

        }

    }
);


/* =========================================
   ADMIN PAYMENTS
========================================= */

app.get(
    "/api/admin/payments",
    async (req, res) => {

        try {

            const [
                payments
            ] = await db.query(`

                SELECT

                    p.id,

                    p.order_id,

                    p.reference,

                    p.amount,

                    p.method,

                    p.status,

                    p.paid_at,

                    p.created_at,

                    c.name AS customer_name,

                    c.email AS customer_email

                FROM payments p

                LEFT JOIN orders o
                    ON p.order_id = o.id

                LEFT JOIN customers c
                    ON o.customer_id = c.id

                ORDER BY
                    p.created_at DESC

            `);


            res.json({

                success: true,

                payments

            });


        } catch (error) {

            console.error(
                "Admin payments error:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Failed to load payments."

            });

        }

    }
);


/* =========================================
   MULTER ERROR HANDLER
========================================= */

app.use(
    (error, req, res, next) => {

        if (
            error &&
            error.message
        ) {

            console.error(
                "Server error:",
                error.message
            );

            return res.status(400).json({

                success: false,

                message:
                    error.message

            });

        }

        next(error);

    }
);


// ==========================================
// ADMIN DASHBOARD API
// ==========================================



// ========================================
// ADMIN API AUTHENTICATION
// ========================================

function requireAdminAPI(req, res, next) {

    if (!req.session.admin) {

        return res.status(401).json({
            success: false,
            message: "Admin authentication required."
        });
    }

    next();
}


// Protect all admin APIs except login
app.use("/api/admin", (req, res, next) => {

    if (req.path === "/login") {
        return next();
    }

    return requireAdminAPI(req, res, next);
});

app.put("/api/admin/change-password", requireAdminAPI, async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;

        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "All password fields are required."
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "New passwords do not match."
            });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: "New password must be at least 8 characters."
            });
        }

        const adminId = req.session.admin.id;

        const [admins] = await db.query(
            "SELECT * FROM admins WHERE id = ? LIMIT 1",
            [adminId]
        );

        if (admins.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Admin account not found."
            });
        }

        const admin = admins[0];

        const passwordMatches = await bcrypt.compare(
            currentPassword,
            admin.password
        );

        if (!passwordMatches) {
            return res.status(401).json({
                success: false,
                message: "Current password is incorrect."
            });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 12);

        await db.query(
            "UPDATE admins SET password = ? WHERE id = ?",
            [hashedPassword, adminId]
        );

        res.json({
            success: true,
            message: "Admin password changed successfully."
        });

    } catch (error) {
        console.error("Admin change password error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to change password."
        });
    }
});


// ========================================
// ADMIN LOGIN
// ========================================

app.post("/api/admin/login", async (req, res) => {

    try {

        const { email, password } = req.body;

        if (!email || !password) {

            return res.status(400).json({
                success: false,
                message: "Email and password are required."
            });
        }

        const [admins] = await db.query(
            `
            SELECT
                id,
                name,
                email,
                password,
                role
            FROM admins
            WHERE email = ?
            LIMIT 1
            `,
            [email.trim()]
        );

        if (admins.length === 0) {

            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        const admin = admins[0];

        const passwordMatch =
            await bcrypt.compare(
                password,
                admin.password
            );

        if (!passwordMatch) {

            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        // Create admin session
        req.session.admin = {
            id: admin.id,
            name: admin.name,
            email: admin.email,
            role: admin.role
        };

        res.json({
            success: true,
            message: "Admin login successful.",

            admin: {
                id: admin.id,
                name: admin.name,
                email: admin.email,
                role: admin.role
            }
        });

    } catch (error) {

        console.error(
            "Admin login error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Admin login failed."
        });
    }
});


// ========================================
// ADMIN LOGOUT
// ========================================

app.post("/api/admin/logout", (req, res) => {

    req.session.admin = null;

    res.json({
        success: true,
        message: "Admin logged out successfully."
    });
});



// ========================================
// CURRENT ADMIN
// ========================================

app.get("/api/admin/me", (req, res) => {

    if (!req.session.admin) {

        return res.status(401).json({
            success: false,
            message: "Admin is not logged in."
        });
    }

    res.json({
        success: true,
        admin: req.session.admin
    });
});




console.log("🔥 ADMIN DASHBOARD ROUTE REGISTERING");



app.get("/api/admin/dashboard", async (req, res) => {
    try {
        // ------------------------------
        // TOTAL CUSTOMERS
        // ------------------------------
        const [[customerStats]] = await db.query(`
            SELECT
                COUNT(*) AS total_customers,
                SUM(
                    CASE
                        WHEN email_verified = 1 THEN 1
                        ELSE 0
                    END
                ) AS verified_customers
            FROM customers
        `);

        // ------------------------------
        // ORDER STATISTICS
        // ------------------------------
        const [[orderStats]] = await db.query(`
            SELECT
                COUNT(*) AS total_orders,

                SUM(
                    CASE
                        WHEN status = 'Pending'
                        THEN 1 ELSE 0
                    END
                ) AS pending_orders,

                SUM(
                    CASE
                        WHEN status = 'Delivered'
                        THEN 1 ELSE 0
                    END
                ) AS delivered_orders,

                COALESCE(
                    SUM(
                        CASE
                            WHEN payment_status = 'Paid'
                            THEN total
                            ELSE 0
                        END
                    ),
                    0
                ) AS total_sales
            FROM orders
        `);

        // ------------------------------
        // PRODUCT STATISTICS
        // ------------------------------
        const [[productStats]] = await db.query(`
            SELECT
                COUNT(*) AS total_products,

                SUM(
                    CASE
                        WHEN stock <= 5
                        THEN 1 ELSE 0
                    END
                ) AS low_stock_products,

                SUM(
                    CASE
                        WHEN stock = 0
                        THEN 1 ELSE 0
                    END
                ) AS out_of_stock_products
            FROM products
        `);

        // ------------------------------
        // PAYMENT STATISTICS
        // ------------------------------
        const [[paymentStats]] = await db.query(`
            SELECT
                COUNT(*) AS total_payments,

                SUM(
                    CASE
                        WHEN status = 'Paid'
                        THEN 1 ELSE 0
                    END
                ) AS paid_payments,

                SUM(
                    CASE
                        WHEN status = 'Pending'
                        THEN 1 ELSE 0
                    END
                ) AS pending_payments,

                COALESCE(
                    SUM(
                        CASE
                            WHEN status = 'Paid'
                            THEN amount
                            ELSE 0
                        END
                    ),
                    0
                ) AS total_paid
            FROM payments
        `);

        // ------------------------------
        // RECENT ORDERS
        // ------------------------------
        const [recentOrders] = await db.query(`
            SELECT
                o.id,
                o.total,
                o.delivery_fee,
                o.status,
                o.payment_status,
                o.created_at,
                c.name AS customer_name,
                c.email AS customer_email
            FROM orders o
            LEFT JOIN customers c
                ON o.customer_id = c.id
            ORDER BY o.created_at DESC
            LIMIT 10
        `);

        // ------------------------------
        // RECENT CUSTOMERS
        // ------------------------------
        const [recentCustomers] = await db.query(`
            SELECT
                id,
                name,
                email,
                phone,
                email_verified,
                created_at
            FROM customers
            ORDER BY created_at DESC
            LIMIT 10
        `);

        // ------------------------------
        // LOW STOCK PRODUCTS
        // ------------------------------
        const [lowStockProducts] = await db.query(`
            SELECT
                id,
                name,
                stock,
                price,
                main_image,
                status
            FROM products
            WHERE stock <= 5
            ORDER BY stock ASC
            LIMIT 10
        `);

        // ------------------------------
        // RESPONSE
        // ------------------------------
        res.json({
            success: true,

            statistics: {
                customers: {
                    total: Number(customerStats.total_customers || 0),
                    verified: Number(customerStats.verified_customers || 0)
                },

                orders: {
                    total: Number(orderStats.total_orders || 0),
                    pending: Number(orderStats.pending_orders || 0),
                    delivered: Number(orderStats.delivered_orders || 0)
                },

                products: {
                    total: Number(productStats.total_products || 0),
                    lowStock: Number(productStats.low_stock_products || 0),
                    outOfStock: Number(productStats.out_of_stock_products || 0)
                },

                payments: {
                    total: Number(paymentStats.total_payments || 0),
                    paid: Number(paymentStats.paid_payments || 0),
                    pending: Number(paymentStats.pending_payments || 0),
                    totalPaid: Number(paymentStats.total_paid || 0)
                },

                totalSales: Number(orderStats.total_sales || 0)
            },

            recentOrders,
            recentCustomers,
            lowStockProducts
        });

    } catch (error) {
        console.error("Admin dashboard error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to load dashboard data."
        });
    }
});

// ==========================================
// ADMIN DASHBOARD API
// ==========================================

app.get("/api/admin/dashboard", async (req, res) => {
    try {

        // TOTAL CUSTOMERS
        const [[customerStats]] = await db.query(`
            SELECT
                COUNT(*) AS total_customers,
                SUM(
                    CASE
                        WHEN email_verified = 1 THEN 1
                        ELSE 0
                    END
                ) AS verified_customers
            FROM customers
        `);


        // ORDERS
        const [[orderStats]] = await db.query(`
            SELECT
                COUNT(*) AS total_orders,

                SUM(
                    CASE
                        WHEN status = 'Pending'
                        THEN 1
                        ELSE 0
                    END
                ) AS pending_orders,

                SUM(
                    CASE
                        WHEN status = 'Delivered'
                        THEN 1
                        ELSE 0
                    END
                ) AS delivered_orders,

                COALESCE(
                    SUM(
                        CASE
                            WHEN payment_status = 'Paid'
                            THEN total
                            ELSE 0
                        END
                    ),
                    0
                ) AS total_sales

            FROM orders
        `);


        // PRODUCTS
        const [[productStats]] = await db.query(`
            SELECT
                COUNT(*) AS total_products,

                SUM(
                    CASE
                        WHEN stock <= 5
                        THEN 1
                        ELSE 0
                    END
                ) AS low_stock_products,

                SUM(
                    CASE
                        WHEN stock = 0
                        THEN 1
                        ELSE 0
                    END
                ) AS out_of_stock_products

            FROM products
        `);


        // PAYMENTS
        const [[paymentStats]] = await db.query(`
            SELECT
                COUNT(*) AS total_payments,

                SUM(
                    CASE
                        WHEN status = 'Paid'
                        THEN 1
                        ELSE 0
                    END
                ) AS paid_payments,

                SUM(
                    CASE
                        WHEN status = 'Pending'
                        THEN 1
                        ELSE 0
                    END
                ) AS pending_payments,

                COALESCE(
                    SUM(
                        CASE
                            WHEN status = 'Paid'
                            THEN amount
                            ELSE 0
                        END
                    ),
                    0
                ) AS total_paid

            FROM payments
        `);


        // RECENT ORDERS
        const [recentOrders] = await db.query(`
            SELECT
                o.id,
                o.total,
                o.delivery_fee,
                o.status,
                o.payment_status,
                o.created_at,

                c.name AS customer_name,
                c.email AS customer_email

            FROM orders o

            LEFT JOIN customers c
                ON o.customer_id = c.id

            ORDER BY o.created_at DESC

            LIMIT 10
        `);


        // RECENT CUSTOMERS
        const [recentCustomers] = await db.query(`
            SELECT
                id,
                name,
                email,
                phone,
                email_verified,
                created_at

            FROM customers

            ORDER BY created_at DESC

            LIMIT 10
        `);


        // LOW STOCK PRODUCTS
        const [lowStockProducts] = await db.query(`
            SELECT
                id,
                name,
                stock,
                price,
                main_image,
                status

            FROM products

            WHERE stock <= 5

            ORDER BY stock ASC

            LIMIT 10
        `);


        // SEND RESPONSE
        res.json({

            success: true,

            statistics: {

                customers: {
                    total: Number(
                        customerStats.total_customers || 0
                    ),

                    verified: Number(
                        customerStats.verified_customers || 0
                    )
                },


                orders: {
                    total: Number(
                        orderStats.total_orders || 0
                    ),

                    pending: Number(
                        orderStats.pending_orders || 0
                    ),

                    delivered: Number(
                        orderStats.delivered_orders || 0
                    )
                },


                products: {
                    total: Number(
                        productStats.total_products || 0
                    ),

                    lowStock: Number(
                        productStats.low_stock_products || 0
                    ),

                    outOfStock: Number(
                        productStats.out_of_stock_products || 0
                    )
                },


                payments: {
                    total: Number(
                        paymentStats.total_payments || 0
                    ),

                    paid: Number(
                        paymentStats.paid_payments || 0
                    ),

                    pending: Number(
                        paymentStats.pending_payments || 0
                    ),

                    totalPaid: Number(
                        paymentStats.total_paid || 0
                    )
                },


                totalSales: Number(
                    orderStats.total_sales || 0
                )

            },


            recentOrders,

            recentCustomers,

            lowStockProducts

        });

    } catch (error) {

        console.error(
            "Admin dashboard error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Failed to load dashboard data."

        });

    }
});


// ==========================================
// ADMIN BANNERS API
// ==========================================

// GET ALL BANNERS
app.get("/api/admin/banners", async (req, res) => {
    try {
        const [banners] = await db.query(`
            SELECT
                id,
                title,
                description,
                image,
                button_text,
                button_link,
                start_date,
                end_date,
                is_active,
                created_at
            FROM banners
            ORDER BY id DESC
        `);

        res.json({
            success: true,
            banners
        });

    } catch (error) {
        console.error("Get banners error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to load banners."
        });
    }
});


// CREATE BANNER
app.post("/api/admin/banners", async (req, res) => {
    try {

        const {
            title,
            description,
            image,
            button_text,
            button_link,
            start_date,
            end_date,
            is_active
        } = req.body;


        if (!image || image.trim() === "") {
            return res.status(400).json({
                success: false,
                message: "Banner image is required."
            });
        }


        const [result] = await db.query(`
            INSERT INTO banners
            (
                title,
                description,
                image,
                button_text,
                button_link,
                start_date,
                end_date,
                is_active
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            title || null,
            description || null,
            image.trim(),
            button_text || null,
            button_link || null,
            start_date || null,
            end_date || null,
            is_active === false ? 0 : 1
        ]);


        res.json({
            success: true,
            message: "Banner created successfully.",
            bannerId: result.insertId
        });

    } catch (error) {

        console.error("Create banner error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to create banner."
        });
    }
});


// UPDATE BANNER
app.put("/api/admin/banners/:id", async (req, res) => {
    try {

        const bannerId = Number(req.params.id);

        if (!Number.isInteger(bannerId) || bannerId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid banner ID."
            });
        }


        const {
            title,
            description,
            image,
            button_text,
            button_link,
            start_date,
            end_date,
            is_active
        } = req.body;


        if (!image || image.trim() === "") {
            return res.status(400).json({
                success: false,
                message: "Banner image is required."
            });
        }


        const [result] = await db.query(`
            UPDATE banners

            SET
                title = ?,
                description = ?,
                image = ?,
                button_text = ?,
                button_link = ?,
                start_date = ?,
                end_date = ?,
                is_active = ?

            WHERE id = ?
        `, [
            title || null,
            description || null,
            image.trim(),
            button_text || null,
            button_link || null,
            start_date || null,
            end_date || null,
            is_active ? 1 : 0,
            bannerId
        ]);


        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Banner not found."
            });
        }


        res.json({
            success: true,
            message: "Banner updated successfully."
        });

    } catch (error) {

        console.error("Update banner error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to update banner."
        });
    }
});


// DELETE BANNER
app.delete("/api/admin/banners/:id", async (req, res) => {
    try {

        const bannerId = Number(req.params.id);

        if (!Number.isInteger(bannerId) || bannerId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid banner ID."
            });
        }


        const [result] = await db.query(`
            DELETE FROM banners
            WHERE id = ?
        `, [bannerId]);


        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Banner not found."
            });
        }


        res.json({
            success: true,
            message: "Banner deleted successfully."
        });

    } catch (error) {

        console.error("Delete banner error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to delete banner."
        });
    }
});


// TOGGLE BANNER STATUS
app.put("/api/admin/banners/:id/toggle", async (req, res) => {
    try {

        const bannerId = Number(req.params.id);

        if (!Number.isInteger(bannerId) || bannerId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid banner ID."
            });
        }


        const [banners] = await db.query(`
            SELECT is_active
            FROM banners
            WHERE id = ?
        `, [bannerId]);


        if (banners.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Banner not found."
            });
        }


        const newStatus =
            Number(banners[0].is_active) === 1
                ? 0
                : 1;


        await db.query(`
            UPDATE banners
            SET is_active = ?
            WHERE id = ?
        `, [
            newStatus,
            bannerId
        ]);


        res.json({
            success: true,
            message: "Banner status updated.",
            is_active: newStatus
        });

    } catch (error) {

        console.error("Toggle banner error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to update banner status."
        });
    }
});

// ==========================================
// UPLOAD BANNER IMAGE
// ==========================================

app.post(
    "/api/admin/banners/upload",
    bannerUpload.single("bannerImage"),
    async (req, res) => {

        try {

            if (!req.file) {

                return res.status(400).json({
                    success: false,
                    message: "Please select a banner image."
                });

            }

            const imagePath =
                "/uploads/" + req.file.filename;

            res.json({
                success: true,
                message: "Banner image uploaded successfully.",
                image: imagePath
            });

        } catch (error) {

            console.error(
                "Banner image upload error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    error.message ||
                    "Failed to upload banner image."
            });

        }

    }
);


// ==========================================
// PUBLIC BANNERS
// ==========================================

app.get("/api/banners", async (req, res) => {
    try {

        const [banners] = await db.query(`
            SELECT
                id,
                title,
                description,
                image,
                button_text,
                button_link
            FROM banners
            WHERE is_active = 1
              AND (start_date IS NULL OR start_date <= NOW())
              AND (end_date IS NULL OR end_date >= NOW())
            ORDER BY id DESC
        `);

        res.json({
            success: true,
            banners
        });

    } catch (error) {

        console.error("Get public banners error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to load banners."
        });

    }
});

// ==========================================
// PUBLIC WEBSITE SECTIONS
// ==========================================

app.get("/api/website-sections", async (req, res) => {
    try {
        const [sections] = await db.query(`
            SELECT
                id,
                section_name,
                title,
                description,
                image,
                button_text,
                button_link,
                display_order
            FROM website_sections
            WHERE is_visible = 1
            ORDER BY display_order ASC, id ASC
        `);

        res.json({
            success: true,
            sections
        });

    } catch (error) {
        console.error("Get public website sections error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to load website sections."
        });
    }
});



// ==========================================
// ADMIN WEBSITE SECTIONS
// ==========================================

// GET WEBSITE SECTIONS
app.get("/api/admin/website-sections", async (req, res) => {

    try {

        const [sections] = await db.query(`
            SELECT
                id,
                section_name,
                title,
                description,
                image,
                button_text,
                button_link,
                display_order,
                is_visible,
                created_at,
                updated_at
            FROM website_sections
            ORDER BY display_order ASC, id ASC
        `);

        res.json({
            success: true,
            sections
        });

    } catch (error) {

        console.error(
            "Get website sections error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to load website sections."
        });

    }

});


// CREATE WEBSITE SECTION
app.post("/api/admin/website-sections", async (req, res) => {

    try {

        const {
            section_name,
            title,
            description,
            image,
            button_text,
            button_link,
            display_order,
            is_visible
        } = req.body;


        if (
            !section_name ||
            section_name.trim() === ""
        ) {

            return res.status(400).json({
                success: false,
                message: "Section name is required."
            });

        }


        const [result] = await db.query(`
            INSERT INTO website_sections
            (
                section_name,
                title,
                description,
                image,
                button_text,
                button_link,
                display_order,
                is_visible
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [

            section_name.trim(),

            title || null,

            description || null,

            image || null,

            button_text || null,

            button_link || null,

            Number(display_order) || 0,

            is_visible === false ? 0 : 1

        ]);


        res.json({
            success: true,
            message: "Website section created successfully.",
            sectionId: result.insertId
        });


    } catch (error) {

        console.error(
            "Create website section error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to create website section."
        });

    }

});


// UPDATE WEBSITE SECTION
app.put("/api/admin/website-sections/:id", async (req, res) => {

    try {

        const sectionId =
            Number(req.params.id);


        const {
            section_name,
            title,
            description,
            image,
            button_text,
            button_link,
            display_order,
            is_visible
        } = req.body;


        if (!section_name || section_name.trim() === "") {

            return res.status(400).json({
                success: false,
                message: "Section name is required."
            });

        }


        await db.query(`
            UPDATE website_sections

            SET
                section_name = ?,
                title = ?,
                description = ?,
                image = ?,
                button_text = ?,
                button_link = ?,
                display_order = ?,
                is_visible = ?

            WHERE id = ?
        `, [

            section_name.trim(),

            title || null,

            description || null,

            image || null,

            button_text || null,

            button_link || null,

            Number(display_order) || 0,

            is_visible ? 1 : 0,

            sectionId

        ]);


        res.json({
            success: true,
            message: "Website section updated successfully."
        });


    } catch (error) {

        console.error(
            "Update website section error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to update website section."
        });

    }

});


// DELETE WEBSITE SECTION
app.delete("/api/admin/website-sections/:id", async (req, res) => {

    try {

        const sectionId =
            Number(req.params.id);


        await db.query(`
            DELETE FROM website_sections
            WHERE id = ?
        `, [sectionId]);


        res.json({
            success: true,
            message: "Website section deleted successfully."
        });


    } catch (error) {

        console.error(
            "Delete website section error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to delete website section."
        });

    }

});


// TOGGLE VISIBILITY
app.put("/api/admin/website-sections/:id/toggle", async (req, res) => {

    try {

        const sectionId =
            Number(req.params.id);


        const [rows] = await db.query(`
            SELECT is_visible
            FROM website_sections
            WHERE id = ?
        `, [sectionId]);


        if (rows.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Website section not found."
            });

        }


        const newVisibility =
            rows[0].is_visible ? 0 : 1;


        await db.query(`
            UPDATE website_sections
            SET is_visible = ?
            WHERE id = ?
        `, [
            newVisibility,
            sectionId
        ]);


        res.json({
            success: true,
            message: newVisibility
                ? "Section is now visible."
                : "Section is now hidden.",
            is_visible: newVisibility
        });


    } catch (error) {

        console.error(
            "Toggle website section error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to change section visibility."
        });

    }

});


// ==========================================
// ADMIN SETTINGS
// ==========================================

// GET ALL SETTINGS
app.get("/api/admin/settings", async (req, res) => {
    try {
        const [settings] = await db.query(`
            SELECT
                id,
                setting_name,
                setting_value,
                updated_at
            FROM settings
            ORDER BY setting_name ASC
        `);

        res.json({
            success: true,
            settings
        });

    } catch (error) {
        console.error("Get settings error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to load settings."
        });
    }
});


// CREATE OR UPDATE SETTING
app.put("/api/admin/settings/:name", async (req, res) => {
    try {
        const settingName = req.params.name;
        const { setting_value } = req.body;

        if (!settingName || settingName.trim() === "") {
            return res.status(400).json({
                success: false,
                message: "Setting name is required."
            });
        }

        await db.query(`
            INSERT INTO settings
            (
                setting_name,
                setting_value
            )
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE
                setting_value = VALUES(setting_value)
        `, [
            settingName.trim(),
            setting_value ?? null
        ]);

        res.json({
            success: true,
            message: "Setting saved successfully."
        });

    } catch (error) {
        console.error("Save setting error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to save setting."
        });
    }
});


// DELETE SETTING
app.delete("/api/admin/settings/:name", async (req, res) => {
    try {
        const settingName = req.params.name;

        await db.query(`
            DELETE FROM settings
            WHERE setting_name = ?
        `, [settingName]);

        res.json({
            success: true,
            message: "Setting deleted successfully."
        });

    } catch (error) {
        console.error("Delete setting error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to delete setting."
        });
    }
});

// ==========================================
// PUBLIC WEBSITE SETTINGS
// ==========================================

app.get("/api/settings", async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT
                setting_name,
                setting_value
            FROM settings
        `);

        const settings = {};

        rows.forEach(row => {
            settings[row.setting_name] = row.setting_value;
        });

        res.json({
            success: true,
            settings
        });

    } catch (error) {
        console.error("Get public settings error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to load website settings."
        });
    }
});

// ==========================================
// ADMIN WEBSITE SETTINGS
// ==========================================

app.get("/api/admin/settings", requireAdminAPI, async (req, res) => {
    try {
        const [rows] = await db.query(
            "SELECT setting_name, setting_value FROM settings ORDER BY setting_name"
        );

        const settings = {};

        rows.forEach(row => {
            settings[row.setting_name] = row.setting_value;
        });

        res.json({
            success: true,
            settings
        });

    } catch (error) {
        console.error("Load admin settings error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to load website settings."
        });
    }
});


app.put("/api/admin/settings", requireAdminAPI, async (req, res) => {
    try {

        const settings = req.body;

        if (!settings || typeof settings !== "object") {
            return res.status(400).json({
                success: false,
                message: "Invalid settings data."
            });
        }

        for (const [name, value] of Object.entries(settings)) {

            await db.query(
                `
                INSERT INTO settings
                    (setting_name, setting_value)
                VALUES
                    (?, ?)
                ON DUPLICATE KEY UPDATE
                    setting_value = VALUES(setting_value),
                    updated_at = CURRENT_TIMESTAMP
                `,
                [
                    name,
                    String(value)
                ]
            );

        }

        res.json({
            success: true,
            message: "Website settings saved successfully."
        });

    } catch (error) {

        console.error(
            "Save admin settings error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to save website settings."
        });

    }
});



/* =========================================
   CUSTOMER CARE
========================================= */


/* =========================================
   GET CUSTOMER CARE MESSAGES
========================================= */

app.get(
    "/api/customer-care/messages",
    async (req, res) => {

        try {

            if (!req.session.customerId) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Please login first."

                });

            }

            const customerId =
                req.session.customerId;


            const [messages] = await db.query(

                `SELECT
                    id,
                    sender_type,
                    message,
                    is_read,
                    created_at
                 FROM customer_care_messages
                 WHERE user_id = ?
                 ORDER BY created_at ASC`,

                [customerId]

            );


            res.json({

                success: true,

                messages: messages

            });

        } catch (error) {

            console.error(
                "Customer Care load error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Unable to load messages."

            });

        }

    }
);


/* =========================================
   SEND CUSTOMER CARE MESSAGE
========================================= */

app.post(
    "/api/customer-care/messages",
    async (req, res) => {

        try {

            if (!req.session.customerId) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Please login first."

                });

            }


            const customerId =
                req.session.customerId;


            const message =
                String(
                    req.body.message || ""
                ).trim();


            if (!message) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please enter a message."

                });

            }


            if (message.length > 2000) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Message is too long."

                });

            }


            await db.query(

                `INSERT INTO customer_care_messages
                (
                    user_id,
                    sender_type,
                    message,
                    is_read
                )
                VALUES
                (?, 'customer', ?, 0)`,

                [
                    customerId,
                    message
                ]

            );


            res.json({

                success: true,

                message:
                    "Message sent successfully."

            });

        } catch (error) {

            console.error(
                "Customer Care send error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Unable to send message."

            });

        }

    }
);



/* =========================================
   MARK CUSTOMER CARE MESSAGES AS READ
========================================= */

app.put(
    "/api/customer-care/read",
    async (req, res) => {

        try {

            if (!req.session.customerId) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Please login first."

                });

            }


            const customerId =
                req.session.customerId;


            await db.query(

                `UPDATE customer_care_messages
                 SET is_read = 1
                 WHERE user_id = ?
                 AND sender_type = 'admin'`,

                [customerId]

            );


            res.json({

                success: true

            });

        } catch (error) {

            console.error(
                "Customer Care read error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Unable to update messages."

            });

        }

    }
);



/* =========================================
   SEND CUSTOMER CARE MESSAGE
========================================= */

app.post(
    "/api/customer-care/messages",
    async (req, res) => {

        try {

            if (!req.session.customerId) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Please login first."

                });

            }


            const customerId =
                req.session.customerId;


            const message =
                String(req.body.message || "").trim();


            if (!message) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please enter a message."

                });

            }


            if (message.length > 2000) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Message is too long."

                });

            }


            await db.query(

                `INSERT INTO customer_care_messages
                (
                    user_id,
                    sender_type,
                    message,
                    is_read
                )
                VALUES (?, 'customer', ?, 0)`,

                [
                    customerId,
                    message
                ]

            );


            res.json({

                success: true,

                message:
                    "Message sent successfully."

            });

        } catch (error) {

            console.error(
                "Customer Care send error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Unable to send message."

            });

        }

    }
);


/* =========================================
   MARK CUSTOMER CARE MESSAGES AS READ
========================================= */

app.put(
    "/api/customer-care/read",
    async (req, res) => {

        try {

            if (!req.session.customerId) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Please login first."

                });

            }


            const customerId =
                req.session.customerId;


            await db.query(

                `UPDATE customer_care_messages
                 SET is_read = 1
                 WHERE user_id = ?
                 AND sender_type = 'admin'`,

                [customerId]

            );


            res.json({

                success: true

            });

        } catch (error) {

            console.error(
                "Customer Care read error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Unable to update messages."

            });

        }

    }
);




/* =========================================
   CUSTOMER CARE API
========================================= */

app.get("/api/customer-care/messages", async (req, res) => {

    try {

        if (!req.session.customerId) {

            return res.status(401).json({
                success: false,
                message: "Please login first."
            });

        }

        const customerId = req.session.customerId;

        const [messages] = await db.query(
            `SELECT
                id,
                sender_type,
                message,
                is_read,
                created_at
             FROM customer_care_messages
             WHERE user_id = ?
             ORDER BY created_at ASC`,
            [customerId]
        );

        res.json({
            success: true,
            messages: messages
        });

    } catch (error) {

        console.error(
            "Customer Care GET error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Unable to load messages."
        });

    }

});


app.post("/api/customer-care/messages", async (req, res) => {

    try {

        if (!req.session.customerId) {

            return res.status(401).json({
                success: false,
                message: "Please login first."
            });

        }

        const customerId = req.session.customerId;

        const message =
            String(req.body.message || "").trim();


        if (!message) {

            return res.status(400).json({
                success: false,
                message: "Please enter a message."
            });

        }


        if (message.length > 2000) {

            return res.status(400).json({
                success: false,
                message: "Message is too long."
            });

        }


        await db.query(
            `INSERT INTO customer_care_messages
                (user_id, sender_type, message, is_read)
             VALUES
                (?, 'customer', ?, 0)`,
            [
                customerId,
                message
            ]
        );


        res.json({
            success: true,
            message: "Message sent successfully."
        });

    } catch (error) {

        console.error(
            "Customer Care POST error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Unable to send message."
        });

    }

});


app.put("/api/customer-care/read", async (req, res) => {

    try {

        if (!req.session.customerId) {

            return res.status(401).json({
                success: false,
                message: "Please login first."
            });

        }

        const customerId = req.session.customerId;


        await db.query(
            `UPDATE customer_care_messages
             SET is_read = 1
             WHERE user_id = ?
             AND sender_type = 'admin'`,
            [customerId]
        );


        res.json({
            success: true
        });

    } catch (error) {

        console.error(
            "Customer Care READ error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Unable to update messages."
        });

    }

});




/* =========================================
   ADMIN CUSTOMER CARE ROUTES
========================================= */

// LOAD CUSTOMER CONVERSATIONS
app.get("/api/admin/customer-care/conversations", async (req, res) => {
    try {
        if (!req.session.admin) {
            return res.status(401).json({
                success: false,
                message: "Admin authentication required."
            });
        }

        const [customers] = await db.query(`
            SELECT
                c.id,
                c.name,
                c.email,
                c.phone,
                MAX(m.created_at) AS last_message_at,
                SUM(
                    CASE
                        WHEN m.sender_type = 'customer'
                        AND m.is_read = 0
                        THEN 1
                        ELSE 0
                    END
                ) AS unread_count
            FROM customers c
            INNER JOIN customer_care_messages m
                ON m.user_id = c.id
            GROUP BY
                c.id,
                c.name,
                c.email,
                c.phone
            ORDER BY last_message_at DESC
        `);

        res.json({
            success: true,
            customers: customers
        });

    } catch (error) {
        console.error("Admin Customer Care conversations error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to load customer conversations."
        });
    }
});


// LOAD MESSAGES FOR ONE CUSTOMER
app.get("/api/admin/customer-care/messages/:customerId", async (req, res) => {
    try {
        if (!req.session.admin) {
            return res.status(401).json({
                success: false,
                message: "Admin authentication required."
            });
        }

        const customerId = Number(req.params.customerId);

        if (!Number.isInteger(customerId) || customerId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid customer ID."
            });
        }

        const [customers] = await db.query(
            `
            SELECT id, name, email, phone
            FROM customers
            WHERE id = ?
            `,
            [customerId]
        );

        if (customers.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Customer not found."
            });
        }

        const [messages] = await db.query(
            `
            SELECT
                id,
                sender_type,
                message,
                is_read,
                created_at
            FROM customer_care_messages
            WHERE user_id = ?
            ORDER BY created_at ASC
            `,
            [customerId]
        );

        res.json({
            success: true,
            customer: customers[0],
            messages: messages
        });

    } catch (error) {
        console.error("Admin Customer Care messages error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to load customer messages."
        });
    }
});


// MARK CUSTOMER MESSAGES AS READ
app.put("/api/admin/customer-care/read/:customerId", async (req, res) => {
    try {
        if (!req.session.admin) {
            return res.status(401).json({
                success: false,
                message: "Admin authentication required."
            });
        }

        const customerId = Number(req.params.customerId);

        if (!Number.isInteger(customerId) || customerId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid customer ID."
            });
        }

        await db.query(
            `
            UPDATE customer_care_messages
            SET is_read = 1
            WHERE user_id = ?
            AND sender_type = 'customer'
            `,
            [customerId]
        );

        res.json({
            success: true
        });

    } catch (error) {
        console.error("Admin Customer Care read error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to mark messages as read."
        });
    }
});


// SEND ADMIN REPLY
app.post("/api/admin/customer-care/messages", async (req, res) => {
    try {
        if (!req.session.admin) {
            return res.status(401).json({
                success: false,
                message: "Admin authentication required."
            });
        }

        const customerId = Number(req.body.customerId);
        const message = String(req.body.message || "").trim();

        if (!Number.isInteger(customerId) || customerId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid customer ID."
            });
        }

        if (!message) {
            return res.status(400).json({
                success: false,
                message: "Please enter a message."
            });
        }

        if (message.length > 2000) {
            return res.status(400).json({
                success: false,
                message: "Message is too long."
            });
        }

        const [customers] = await db.query(
            `
            SELECT id
            FROM customers
            WHERE id = ?
            `,
            [customerId]
        );

        if (customers.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Customer not found."
            });
        }

        await db.query(
            `
            INSERT INTO customer_care_messages
            (
                user_id,
                sender_type,
                message,
                is_read
            )
            VALUES (?, 'admin', ?, 0)
            `,
            [customerId, message]
        );

        res.json({
            success: true,
            message: "Reply sent successfully."
        });

    } catch (error) {
        console.error("Admin Customer Care send error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to send reply."
        });
    }
});





/* =========================================
   START SERVER
========================================= */

app.listen(
    PORT,
    () => {

        console.log("---------------------------------");

        console.log(
            `NED HUB running at http://localhost:${PORT}`
        );

        console.log("---------------------------------");

    }
);
