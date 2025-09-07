import { verifyUser, db as mockDb } from "../server.js";
import bcrypt from "bcrypt";
// import mockDb from "../__mocks__/db.js";
import { describe, jest } from "@jest/globals";

jest.spyOn(mockDb, "query");
jest.spyOn(bcrypt, "compare");

describe("verifyUser", () => {
  it("succeeds with valid user and password", async () => {
    const fakeUser = { id: 1, email: "a@b.com", password: "hashed" };
    mockDb.query.mockResolvedValueOnce({ rows: [fakeUser] });
    bcrypt.compare.mockImplementation((pw, hash, cb) => cb(null, true));

    const done = jest.fn();
    await verifyUser("a@b.com", "correct", done);

    expect(done).toHaveBeenCalledWith(null, fakeUser);
  });

  it("fails if user not found", async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [] });

    const done = jest.fn();
    await verifyUser("missing@b.com", "pw", done);

    expect(done).toHaveBeenCalledWith(null, false, { message: "User not found" });
  });

  it("fails if password is wrong", async () => {
    const fakeUser = { id: 1, email: "a@b.com", password: "hashed" };

    mockDb.query.mockResolvedValueOnce({ rows: [fakeUser] });
    bcrypt.compare.mockImplementation((pw, hash, cb) => cb(null, false));

    const done = jest.fn();
    await verifyUser("a@b.com", "wrong", done);

    expect(done).toHaveBeenCalledWith(null, false, { message: "Incorrect password" });
  });

  afterEach(() => {
  jest.resetAllMocks();
});
});