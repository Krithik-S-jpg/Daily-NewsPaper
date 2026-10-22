import { expect, it } from "vitest";
import { seal, unseal } from "../public/offline-crypto.js";
it("encrypts saved content and requires the correct passphrase", async () => {
  const sealed = await seal("private newspaper", "a long sample passphrase");
  expect(JSON.stringify(sealed)).not.toContain("private newspaper");
  expect(await unseal(sealed, "a long sample passphrase")).toBe(
    "private newspaper",
  );
  await expect(
    unseal(sealed, "a different sample passphrase"),
  ).rejects.toThrow();
}, 10000);
it("rejects short offline passphrases", async () => {
  await expect(seal("edition", "short")).rejects.toThrow("12 characters");
});
