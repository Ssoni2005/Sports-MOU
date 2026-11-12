export const entities = {
  "":"Select legal form", individual:"Individual", proprietor:"Sole proprietorship", company:"Company",
  llp:"Limited liability partnership", partnership:"Partnership firm", trust:"Trust", aop:"Association of persons",
  society:"Registered society", huf:"Hindu undivided family", government:"Government body",
  boi:"Body of individuals", local:"Local authority", artificial:"Artificial juridical person", other:"Other · confirm with Accounts"
};
const panType = {individual:"P", proprietor:"P", company:"C", llp:"F", partnership:"F", trust:"T", aop:"A", huf:"H", government:"G", boi:"B", local:"L", artificial:"J"};
export const categoryNames = {
  tobacco:"Tobacco, nicotine or vaping products",
  alcohol:"Alcoholic beverages or liquor",
  drugs:"Illicit drugs or unauthorised trade in controlled substances",
  gambling:"Gambling, betting, casinos or real-money gaming",
  illegal:"Other unlawful goods or services"
};
export const screeningOptions = {"":"Select declaration", no:"No involvement declared", yes:"Involvement disclosed", unknown:"Unconfirmed"};
export const normaliseId = (value) => String(value || "").replace(/\s/g,"").toUpperCase();
const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
export function gstCheckDigit(value) {
  let sum = 0;
  let factor = 2;
  for (const char of Array.from(value).reverse()) {
    const product = chars.indexOf(char) * factor;
    sum += Math.floor(product / 36) + product % 36;
    factor = factor === 2 ? 1 : 2;
  }
  return chars[(36 - sum % 36) % 36];
}

export function statutoryErrors(data) {
  const errors = new Map();
  const add = (id, message) => errors.set(id, message);
  const pan = normaliseId(data.pan);
  const gstin = normaliseId(data.gstin);
  if (pan && !/^[A-Z]{3}[ABCFGHLJPT][A-Z][0-9]{4}[A-Z]$/.test(pan)) add("pan","Enter a PAN in the standard 10-character format.");
  else if (pan && panType[data.entity] && pan[3] !== panType[data.entity]) add("pan","The fourth PAN character does not match the selected legal form.");
  if (data.gstStatus === "registered" && gstin) {
    const state = Number(gstin.slice(0,2));
    if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstin) || !(state >= 1 && state <= 38 || state === 97)) add("gstin","Enter a standard 15-character GSTIN with a valid state or territory code.");
    else if (gstin[14] !== gstCheckDigit(gstin.slice(0,14))) add("gstin","GSTIN checksum does not match. Check the number against the certificate.");
    else if (pan && gstin.slice(2,12) !== pan) add("gstin","The PAN embedded in the GSTIN must match the sponsor PAN.");
  }
  if (data.agreement === "sponsor" && data.type !== "kind" && data.tax === "reverse" && data.gstStatus !== "registered") add("gstStatus","Reverse charge requires a GST-registered sponsor in this workflow. Confirm registration and treatment with Accounts.");
  if (data.agreement === "stall" && data.stallFee !== "waived" && data.tax === "reverse") add("tax","Use an Accounts-confirmed stall fee treatment. This reverse-charge option is for sponsorship.");
  if (data.foodActivity === "yes") {
    if (data.fssai && !/^\d{14}$/.test(normaliseId(data.fssai))) add("fssai","Enter the 14-digit FSSAI registration or licence number.");
    if (data.fssaiExpiry && data.end && data.fssaiExpiry < data.end) add("fssaiExpiry","FSSAI validity must cover the last event date.");
  }
  for (const [id, label] of Object.entries(categoryNames)) {
    if (data[id] && data[id] !== "no") add(id, label + " · hold export and refer to the Registrar for review.");
  }
  const pincode = (data.pinCode || "").trim();
  if (pincode && !/^[1-9][0-9]{5}$/.test(pincode)) add("pinCode","Enter a six-digit Indian PIN code.");
  const email = /[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+/;
  if (data.flameContact && !email.test(data.flameContact)) add("flameContact","Include a valid email for the FLAME contact.");
  if (data.sponsorContact && !email.test(data.sponsorContact)) add("sponsorContact","Include a valid email for the sponsor contact.");
  return errors;
}
