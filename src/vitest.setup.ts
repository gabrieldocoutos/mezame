import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Tauri APIs are not available in the jsdom test environment.
// Tests that need specific invoke behaviour should override these mocks locally.
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(),
  save: vi.fn(),
}));
