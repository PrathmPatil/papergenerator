const SUB_DIGITS: Record<string, string> = {
  "0": "₀",
  "1": "₁",
  "2": "₂",
  "3": "₃",
  "4": "₄",
  "5": "₅",
  "6": "₆",
  "7": "₇",
  "8": "₈",
  "9": "₉",
};

const SUP_CHARS: Record<string, string> = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
  "+": "⁺",
  "-": "⁻",
  "−": "⁻",
};

const ELEMENTS = [
  "Ac", "Al", "Am", "Sb", "Ar", "As", "At", "Ba", "Bk", "Be", "Bi", "Bh", "B",
  "Br", "Cd", "Ca", "Cf", "C", "Ce", "Cs", "Cl", "Cr", "Co", "Cn", "Cu", "Cm",
  "Ds", "Db", "Dy", "Es", "Er", "Eu", "Fm", "Fl", "F", "Fr", "Gd", "Ga", "Ge",
  "Au", "Hf", "Hs", "He", "Ho", "H", "In", "I", "Ir", "Fe", "Kr", "La", "Lr",
  "Pb", "Li", "Lv", "Lu", "Mg", "Mn", "Mt", "Md", "Mo", "Mc", "Nd", "Ne", "Np",
  "Ni", "Nh", "Nb", "N", "No", "Og", "Os", "O", "Pd", "P", "Pt", "Pu", "Po",
  "K", "Pr", "Pm", "Pa", "Ra", "Rn", "Re", "Rh", "Rg", "Rb", "Ru", "Rf", "Sm",
  "Sc", "Sg", "Se", "Si", "Ag", "Na", "Sr", "S", "Ta", "Tc", "Te", "Ts", "Tb",
  "Tl", "Th", "Tm", "Sn", "Ti", "W", "U", "V", "Xe", "Yb", "Y", "Zn", "Zr",
].sort((a, b) => b.length - a.length);

const toSub = (value: string) =>
  String(value).replace(/[0-9]/g, (digit) => SUB_DIGITS[digit] || digit);

const toSup = (value: string) =>
  String(value).replace(/[0-9+\-−]/g, (char) => SUP_CHARS[char] || char);

const findElement = (value: string, index: number) =>
  ELEMENTS.find((element) => value.startsWith(element, index)) || "";

function parseFormulaBody(token: string) {
  let index = 0;
  let converted = false;

  const parseGroup = (): string | null => {
    let output = "";

    while (index < token.length) {
      const current = token[index];

      if (current === "(") {
        index += 1;
        const inner = parseGroup();
        if (inner == null || token[index] !== ")") return null;
        index += 1;
        output += `(${inner})`;
        const count = token.slice(index).match(/^\d+/);
        if (count) {
          output += toSub(count[0]);
          index += count[0].length;
          converted = true;
        }
        continue;
      }

      if (current === ")") break;

      const element = findElement(token, index);
      if (!element) return null;
      index += element.length;
      output += element;

      const count = token.slice(index).match(/^\d+/);
      if (count) {
        output += toSub(count[0]);
        index += count[0].length;
        converted = true;
      }
    }

    return output;
  };

  const body = parseGroup();
  if (body == null) return null;
  return { body, index, converted };
}

function formatFormulaToken(token: string) {
  if (!token || !/[A-Z]/.test(token) || !/[0-9+\-]/.test(token)) return token;

  let charge = "";
  let bodyToken = token;
  const chargeMatch = token.match(/(\^?(?:[+-]\d+|\d+[+-]|[+-]))$/);
  if (chargeMatch && chargeMatch.index && chargeMatch.index > 0) {
    bodyToken = token.slice(0, chargeMatch.index);
    charge = chargeMatch[1].replace(/^\^/, "");
  }

  const parsed = parseFormulaBody(bodyToken);
  if (!parsed || parsed.index !== bodyToken.length) return token;
  if (!parsed.converted && !charge) return token;

  return parsed.body + (charge ? toSup(charge) : "");
}

function formatMarkup(value: string) {
  return value
    .replace(/<sub>(.*?)<\/sub>/gi, (_, content) => toSub(content))
    .replace(/<sup>(.*?)<\/sup>/gi, (_, content) => toSup(content))
    .replace(/_\{([^}]+)\}/g, (_, content) => toSub(content))
    .replace(/\^\{([^}]+)\}/g, (_, content) => toSup(content));
}

function formatScientificNotation(value: string) {
  return value
    .replace(
      /(\d+(?:\.\d+)?)\s*[x×X]\s*10\^([+-]?\d+)/g,
      (_, coeff, exp) => `${coeff} × 10${toSup(exp)}`
    )
    .replace(/(?<![\d.])10\^([+-]?\d+)/g, (_, exp) => `10${toSup(exp)}`);
}

export function formatScientificText(value: unknown) {
  if (value == null) return "";
  const raw = String(value);
  if (!raw) return "";

  const withMarkup = formatScientificNotation(formatMarkup(raw));
  return withMarkup.replace(/[A-Z][A-Za-z0-9()+\-^]*/g, formatFormulaToken);
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const ITALIC_STYLE =
  "font-family:'Times New Roman',Times,Georgia,'Liberation Serif',serif;font-style:italic;font-weight:500";

/** Times-italic letters (the printed *g*). Type *g* or &lt;i&gt;g&lt;/i&gt;. */
export function toScientificHtml(value: unknown) {
  const raw = String(value ?? "");
  if (!raw) return "";

  const re = /<i>([\s\S]*?)<\/i>|\*([^*]+)\*/gi;
  const parts: string[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(raw))) {
    parts.push(escapeHtml(formatScientificText(raw.slice(last, match.index))));
    const inner = match[1] ?? match[2] ?? "";
    parts.push(
      `<i style="${ITALIC_STYLE}">${escapeHtml(formatScientificText(inner))}</i>`
    );
    last = match.index + match[0].length;
  }
  parts.push(escapeHtml(formatScientificText(raw.slice(last))));
  return parts.join("");
}
