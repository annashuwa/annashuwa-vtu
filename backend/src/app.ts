import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth.routes";
import walletRoutes from "./routes/wallet.routes";
import purchaseRoutes from "./routes/purchase.routes";
import catalogueRoutes from "./routes/catalogue.routes";
import userRoutes from "./routes/user.routes";
import airtimeCashRoutes from "./routes/airtime-cash.routes";
import adminRoutes from "./routes/admin.routes";

import { notFoundHandler, errorHandler } from "./lib/errors";
import { requestIdAndLogging } from "./middleware/request-context";
import { abuseShield } from "./middleware/abuse-shield";
import { CORS_ORIGIN } from "./config";
import { isDBConnected } from "./db";

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(
  cors({
    origin: CORS_ORIGIN === "*" ? true : CORS_ORIGIN.split(",").map((s) => s.trim()),
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(abuseShield);
app.use(requestIdAndLogging);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, db: isDBConnected(), ts: new Date().toISOString() });
});

const apiV1 = express.Router();

apiV1.use("/auth", authRoutes);
apiV1.use("/wallet", walletRoutes);
apiV1.use("/", purchaseRoutes);
apiV1.use("/", catalogueRoutes);
apiV1.use("/", userRoutes);
apiV1.use("/", airtimeCashRoutes);
apiV1.use("/admin", adminRoutes);

app.use("/api/v1", apiV1);

app.use("/api/auth", authRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api", purchaseRoutes);
app.use("/api", catalogueRoutes);
app.use("/api", userRoutes);
app.use("/api", airtimeCashRoutes);
app.use("/api/admin", adminRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;