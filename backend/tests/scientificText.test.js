import test from "node:test";
import assert from "node:assert/strict";

import { formatScientificText } from "../utils/scientificText.js";

test("converts chemical subscripts from plain Excel text", () => {
  assert.equal(
    formatScientificText("22 g CO2 and 18 g H2O"),
    "22 g CO₂ and 18 g H₂O"
  );
  assert.equal(
    formatScientificText("The formula unit mass of Al2(SO4)3 is"),
    "The formula unit mass of Al₂(SO₄)₃ is"
  );
  assert.equal(formatScientificText("O2"), "O₂");
  assert.equal(formatScientificText("NH3"), "NH₃");
  assert.equal(formatScientificText("C6H12O6"), "C₆H₁₂O₆");
});

test("converts charges and scientific notation", () => {
  assert.equal(formatScientificText("Ca2+"), "Ca²⁺");
  assert.equal(formatScientificText("SO4^2-"), "SO₄²⁻");
  assert.equal(formatScientificText("10^-9 m"), "10⁻⁹ m");
  assert.equal(formatScientificText("3.7 x 10^-10 m"), "3.7 × 10⁻¹⁰ m");
  assert.equal(formatScientificText("6.023 x 10^23 atoms"), "6.023 × 10²³ atoms");
});

test("accepts explicit Excel markup when auto-detect is not enough", () => {
  assert.equal(formatScientificText("Al_{2}(SO_{4})_{3}"), "Al₂(SO₄)₃");
  assert.equal(formatScientificText("10^{-9} m"), "10⁻⁹ m");
  assert.equal(formatScientificText("H<sup>+</sup>"), "H⁺");
});

test("does not rewrite ordinary words or plain numbers", () => {
  assert.equal(
    formatScientificText("The Indian philosopher Maharishi Kanad"),
    "The Indian philosopher Maharishi Kanad"
  );
  assert.equal(formatScientificText("342 u"), "342 u");
  assert.equal(formatScientificText("He, Ne and Ar"), "He, Ne and Ar");
});
