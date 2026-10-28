"use client";

import { useEffect, useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { CraftModelViewer } from "@/components/model-viewer";

const STAGING_MODEL = {
  url: process.env.NEXT_PUBLIC_STAGING_GLB_URL,
  runId: "test_1793160648_e666169a",
  sha256: "1CF288A4C5F6D689A25B3CC415B7B6CE901BD0B8B1F4FD096828009A02727799",
  master: { bytes: 37_961_892, faces: 970_650, vertices: 657_688 },
  web: { bytes: 21_062_592, faces: 349_999, vertices: 331_746 },
} as const;

function mib(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`;
}

function reduction(master: number, web: number) {
  return `${((1 - web / master) * 100).toFixed(1)}%`;
}

export default function Preview3DPage() {
  const [loadTimeMs, setLoadTimeMs] = useState<number | null>(null);
  const mountTime = useRef<number | null>(null);

  useEffect(() => {
    mountTime.current = performance.now();
    setLoadTimeMs(null);
  }, []);

  const handleModelReady = () => {
    if (mountTime.current !== null) {
      setLoadTimeMs(Math.round(performance.now() - mountTime.current));
    }
  };

  return (
    <main
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "24px 16px",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <header style={{ marginBottom: 20 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 8,
          }}
        >
          <span
            style={{
              background: "#fff3cd",
              color: "#7a5200",
              padding: "4px 10px",
              borderRadius: 20,
              fontSize: "0.8rem",
              fontWeight: 700,
            }}
          >
            STAGING QA — NOT PUBLISHED
          </span>
          <span style={{ color: "#666", fontSize: "0.85rem" }}>
            CraftTrust 3D Pipeline v2
          </span>
        </div>
        <h1
          style={{
            fontSize: "1.75rem",
            fontWeight: 800,
            margin: 0,
            color: "#1a1a1a",
          }}
        >
          Web GLB compatibility and performance check
        </h1>
        <p style={{ color: "#555", fontSize: "0.92rem", marginTop: 6 }}>
          Versioned candidate: 4K WebP Q95, 349,999 faces. This page never
          changes the production Master or published Web GLB.
        </p>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 20,
        }}
      >
        <section
          style={{
            background: "#f8f9fa",
            borderRadius: 12,
            border: "1px solid #e0e0e0",
            padding: 16,
            minHeight: 480,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <strong style={{ fontSize: "0.85rem" }}>web-1cf288a4.glb</strong>
            <span
              data-testid="model-load-time"
              style={{
                color: loadTimeMs === null ? "#777" : "#256029",
                fontSize: "0.78rem",
                fontWeight: 600,
              }}
            >
              {!STAGING_MODEL.url
                ? "Staging asset not configured"
                : loadTimeMs === null
                  ? "Loading model…"
                  : `Loaded in ${loadTimeMs} ms`}
            </span>
          </div>
          {STAGING_MODEL.url ? (
            <CraftModelViewer
              key={STAGING_MODEL.url}
              src={STAGING_MODEL.url}
              poster=""
              onReady={handleModelReady}
              dimensions={{ heightCm: 25, widthCm: 18 }}
            />
          ) : (
            <p className="studio-message">
              Staging asset is not configured in this deployment. Set
              NEXT_PUBLIC_STAGING_GLB_URL to an immutable, non-production test
              object before running viewer QA.
            </p>
          )}
        </section>

        <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div
            style={{
              background: "#fff",
              border: "1px solid #e0e0e0",
              borderRadius: 12,
              padding: 18,
            }}
          >
            <h2
              style={{
                fontSize: "1rem",
                margin: "0 0 12px",
                color: "#1b5e20",
                display: "flex",
                gap: 6,
                alignItems: "center",
              }}
            >
              <ShieldCheck size={18} /> Inspector-verified structure
            </h2>
            <ul
              style={{
                margin: 0,
                paddingLeft: 20,
                lineHeight: 1.7,
                fontSize: "0.88rem",
              }}
            >
              <li>GLB 2.0 with embedded EXT_texture_webp</li>
              <li>UV, NORMAL, material and texture present</li>
              <li>baseColor and metallicRoughness texture slots present</li>
              <li>0 non-manifold edges; Web quality gate passed</li>
            </ul>
          </div>

          <div
            style={{
              background: "#fff",
              border: "1px solid #e0e0e0",
              borderRadius: 12,
              padding: 18,
            }}
          >
            <h2 style={{ fontSize: "1rem", margin: "0 0 12px" }}>
              Master vs versioned Web candidate
            </h2>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.85rem",
              }}
            >
              <thead>
                <tr
                  style={{ borderBottom: "2px solid #eee", textAlign: "left" }}
                >
                  <th>Metric</th>
                  <th>Master</th>
                  <th>Web</th>
                  <th>Reduction</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>File size</td>
                  <td>{mib(STAGING_MODEL.master.bytes)}</td>
                  <td>{mib(STAGING_MODEL.web.bytes)}</td>
                  <td>
                    {reduction(
                      STAGING_MODEL.master.bytes,
                      STAGING_MODEL.web.bytes,
                    )}
                  </td>
                </tr>
                <tr>
                  <td>Faces</td>
                  <td>{STAGING_MODEL.master.faces.toLocaleString()}</td>
                  <td>{STAGING_MODEL.web.faces.toLocaleString()}</td>
                  <td>
                    {reduction(
                      STAGING_MODEL.master.faces,
                      STAGING_MODEL.web.faces,
                    )}
                  </td>
                </tr>
                <tr>
                  <td>Vertices</td>
                  <td>{STAGING_MODEL.master.vertices.toLocaleString()}</td>
                  <td>{STAGING_MODEL.web.vertices.toLocaleString()}</td>
                  <td>
                    {reduction(
                      STAGING_MODEL.master.vertices,
                      STAGING_MODEL.web.vertices,
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div
            style={{
              background: "#eef6ff",
              border: "1px solid #bbdefb",
              borderRadius: 12,
              padding: 18,
              fontSize: "0.84rem",
              lineHeight: 1.6,
            }}
          >
            <strong>Traceability:</strong> run {STAGING_MODEL.runId}
            <br />
            <strong>SHA-256:</strong>{" "}
            <code style={{ overflowWrap: "anywhere" }}>
              {STAGING_MODEL.sha256}
            </code>
            <br />
            Browser emulation is evidence for the web viewer only. Android and
            Zalo readiness still require measurements on real target devices.
          </div>
        </section>
      </div>
    </main>
  );
}
