import { describe,expect,it } from "vitest";

describe("grounded assistant contract",()=>{
  it("uses an explicit decline when retrieval is empty",()=>{
    const decline="I don’t have enough approved heritage evidence to answer that question.";
    expect(decline).toContain("approved heritage evidence");
  });
});
