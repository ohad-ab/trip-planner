import { calculateDuration } from "../utils/duration";

describe("calculateDuration", ()=>{
  test("converts 90 minutes correctly", ()=>{
    expect(calculateDuration(90)).toBe("1h 30m");
  })
  test("handles less than 1 hour", ()=>{
    expect(calculateDuration(45)).toBe("0h 45m");
  });
});
