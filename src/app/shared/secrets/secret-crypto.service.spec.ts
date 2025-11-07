import { TestBed } from "@angular/core/testing";
import { SecretCryptoService } from "./secret-crypto.service";

describe("SecretCryptoService", () => {
  let service: SecretCryptoService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SecretCryptoService],
    });
    service = TestBed.inject(SecretCryptoService);
  });

  it("encrypts and decrypts with passphrase", async () => {
    const envelope = await service.encrypt("hello", "pass");
    const plaintext = await service.decrypt(envelope, "pass");
    expect(plaintext).toBe("hello");
  });

  it("rejects decryption with wrong passphrase", async () => {
    const envelope = await service.encrypt("secret", "pass");
    await expectAsync(service.decrypt(envelope, "nope")).toBeRejected();
  });

  it("generates base64url fields", async () => {
    const envelope = await service.encrypt("payload", "pass");
    expect(envelope.salt).not.toContain("+");
    expect(envelope.iv).not.toContain("/");
  });
});
