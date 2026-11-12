import {entities, categoryNames, screeningOptions, normaliseId, statutoryErrors, gstCheckDigit} from "./checks.mjs";

const text = (id, label, options = {}) => ({ id, label, ...options });
const required = { required: true };
const area = { type: "textarea", full: true };
const confirm = (id, label, options = {}) => text(id, label, {type:"checkbox", full:true, required:true, ...options});
const date = { type: "date", required: true };
const money = { type: "number", min: 0, max: 9999999999, step: ".01" };
const group = (heading) => ({ heading });

export const steps = [
  { tab: "Parties & event", title: "Parties and event", hint: "Use the sponsor’s registered legal name and the confirmed event dates.", fields: [
    text("agreement", "Agreement type", { options:{sponsor:"Event sponsorship", stall:"Campus stall agreement"} }),
    text("foodActivity", "Food or beverage handling at event", { ...required, options:{"":"Select", no:"No", yes:"Yes · sale, sampling or distribution"} }),
    text("event", "Event name", { ...required, full: true }), text("organiser", "Organising club or unit", required), text("venue", "Event venue", required),
    text("start", "Event start", date), text("end", "Event end", date),
    text("eventAbout", "Event description", area), text("city", "Place of execution", required), text("version", "Draft reference or version"), text("execution", "Proposed execution date", {type:"date"}),
    group("Sponsor details"), text("sponsor", "Sponsor legal name", { ...required, full: true }), text("entity", "Counterparty legal form", {...required, options:entities}), text("tier", "Sponsorship designation", {sponsorOnly:true, placeholder:"e.g. Official Sponsor"}),
    text("address", "Registered or principal address", { ...area, ...required }), text("pinCode", "Indian PIN code", required),
    text("tradeName", "Trade or brand name"),
    text("sponsorAbout", "Introduction to the sponsoring body", { ...area, ...required, rows:3, placeholder:"Describe the organisation, its main activities and relevant background." }),
    { logo:true },
    group("University introduction"), text("flameAbout", "Introduction to FLAME University", { ...area, ...required, rows:5 }),
    text("stallDetails", "Stall allocation and operating schedule", { ...area, ...required, stallOnly:true, placeholder:"Specify stall type, size, permitted products, location, setup, sales and handover timings." })
  ] },
  { tab: "Contribution", title: "Sponsorship contribution", hint: "Use the payment and GST treatment confirmed by Accounts.", fields: [
    text("type", "Contribution type", { sponsorOnly:true, options: {cash:"Monetary", kind:"In-kind", mixed:"Monetary and in-kind"} }),
    text("stallFee", "Stall fee status", {stallOnly:true, options:{charge:"Chargeable", waived:"Waived with university approval"}}),
    text("waiver", "Stall fee waiver approval and basis", {...area, ...required, waived:true}),
    text("payment", "Payment schedule", {cash:true, options:{single:"Single payment", split:"Two instalments", custom:"Custom schedule"} }),
    text("amount", "Agreed amount (INR)", { ...money, ...required, cash:true }),
    text("tax", "GST treatment", { ...required, cash:true, options:{"":"Select treatment", exclusive:"GST added to the amount", inclusive:"GST included in the amount", reverse:"Reverse charge · sponsor pays GST separately", none:"No GST charged per Accounts"} }),
    text("rate", "GST rate (%)", { ...money, max:100, rated:true, cash:true }),
    text("due", "Payment due date", { ...date, cash:true, schedules:["single","split"] }),
    text("first", "First instalment (INR)", { ...money, ...required, cash:true, schedules:["split"] }),
    text("due2", "Second instalment due date", { ...date, cash:true, schedules:["split"] }),
    text("schedule", "Custom payment schedule", { ...area, ...required, cash:true, schedules:["custom"], placeholder:"List payment dates, amounts and milestones." }),
    { summary: true },
    text("kind", "In-kind goods or services and delivery terms", { ...area, ...required, kind:true, placeholder:"Include quantities, specifications, deadlines and acceptance criteria." }),
    text("bank", "Verified university payment instructions", { ...area, cash:true, placeholder:"Add confirmed bank details or leave blank to refer to the university invoice." }),
    confirm("accounts", "Accounts has confirmed the applicable tax treatment, invoicing and valuation (including any in-kind exchange)."),
    text("accountsRef", "Accounts review reference", required)
  ] },
  { tab: "Commitments", title: "Commitments and clauses", hint: "Enter each negotiated deliverable on its own line.", fields: [
    text("benefits", "University deliverables", { ...area, ...required, rows:5, placeholder:"e.g. Display sponsor branding on two venue banners." }),
    text("obligations", "Additional sponsor deliverables", { ...area, placeholder:"e.g. Supply approved brand assets by the agreed deadline." }),
    text("termination", "Termination and cancellation", { ...area, ...required, rows:4 }),
    text("campus", "Include the sample’s campus restrictions", { type:"checkbox", full:true }),
    text("extra", "Additional agreed terms", { ...area, placeholder:"e.g. agreed exclusivity, use of images or make-good terms" })
  ] },
  { tab: "Checks", title: "Counterparty checks", hint: "Verify documents at the issuing portals and record your review. The app checks format and consistency locally.", fields: [
    text("pan", "Counterparty PAN", required), text("gstStatus", "GST registration status", {...required, options:{"":"Select status", registered:"Registered", unregistered:"Not registered"}}),
    confirm("panVerified", "PAN, legal name and identity evidence checked."),
    text("gstin", "Counterparty GSTIN", {...required, registered:true}),
    confirm("gstVerified", "GST registration certificate and active GSTIN checked against the legal name.", {registered:true}),
    text("gstBasis", "Reason or basis for no GST registration", {...area, ...required, unregistered:true}),
    text("identityRef", "Identity / registration and signatory authority reference", {...required, full:true, placeholder:"Record the internal reference for documents reviewed."}),
    confirm("identityVerified", "Legal identity, registered address and signatory authority checked."),
    { links:true },
    {heading:"Food safety", food:true}, text("foodOperator", "Food business operator legal name", {...required, food:true}),
    text("fssai", "FSSAI registration or licence number", {...required, food:true}),
    text("fssaiExpiry", "FSSAI valid through", {...date, food:true}),
    confirm("fssaiVerified", "FSSAI record checked for the operator, activity and event dates.", {food:true}),
    group("Restricted business declaration"),
    ...Object.entries(categoryNames).map(([id,label]) => text(id,label,{...required, options:screeningOptions})),
    confirm("declared", "The authorised representative has supplied this declaration, including for represented brands and event partners."),
    text("declarationRef", "Sponsor declaration or screening record reference", {...required, full:true}),
    confirm("includePan", "Show the full PAN on its own line in the Word document.", {required:false})
  ] },
  { tab: "Sign-off", title: "Contacts and signatories", hint: "Enter the officials authorised to sign and the contacts who will administer the agreement.", fields: [
    text("flameContact", "FLAME contact name and email", { ...required, full:true }), text("sponsorContact", "Sponsor contact name and email", { ...required, full:true }),
    text("flameSigner", "FLAME signatory name", required), text("flameRole", "FLAME designation", required),
    text("secondSigner", "Additional FLAME signatory name"), text("secondRole", "Additional FLAME designation"),
    text("sponsorSigner", "Sponsor signatory name", required), text("sponsorRole", "Sponsor designation", required),
    text("copy", "Internal circulation", { ...area, placeholder:"One office or email per line." })
  ] }
];

const flameAbout = "FLAME University is a private university in Pune, Maharashtra, with an academic philosophy rooted in liberal education. It was established under the FLAME University Act, 2014 (Maharashtra Act II of 2015), and is listed in the Schedule to the Maharashtra Private Universities (Establishment and Regulation) Act, 2023 (Maharashtra Act VIII of 2024). The University is recognised by the University Grants Commission under Section 2(f) of the UGC Act, 1956, and awards degrees under Section 22 of that Act. It is a Jain minority institution.";

export const defaults = {
  flameAbout,
  organiser:"Sports Department", city:"Pune", agreement:"sponsor", stallFee:"charge", type:"cash", tax:"", payment:"single", rate:"", campus:true,
  termination:"A Party seeking to terminate this MoU shall give the other Party at least 15 days’ written notice. Termination under this provision requires the other Party’s written consent. The Parties shall record the treatment of payments, committed costs and outstanding deliverables in writing."
};

export const example = {
  ...defaults, event:"Example Inter-University Squash Championship", organiser:"FLAME Squash Club", venue:"FLAME University, Pune", start:"2027-02-12", end:"2027-02-14",
  eventAbout:"An inter-university squash tournament for student players.", version:"DEMO-01",
  sponsor:"Example Sports Sponsor Pvt Ltd", entity:"company", address:"Example address, Pune", pinCode:"411001", tier:"Official Sponsor",
  sponsorAbout:"Illustrative supplier of sporting goods.", foodActivity:"no", pan:"ZZZCZ0000Z", gstStatus:"registered",
  gstin:"27ZZZCZ0000Z1Z" + gstCheckDigit("27ZZZCZ0000Z1Z"), panVerified:true, gstVerified:true, identityVerified:true, identityRef:"DEMO IDENTITY ONLY",
  accounts:true, accountsRef:"DEMO ACCOUNTS ONLY", declared:true, declarationRef:"DEMO DECLARATION ONLY",
  ...Object.fromEntries(Object.keys(categoryNames).map(key => [key,"no"])),
  amount:"50000", tax:"exclusive", rate:"18", due:"2027-02-05",
  benefits:"Recognise the sponsor on event promotional posters.\nDisplay the approved sponsor logo on two venue banners and one standee.\nPublish one event recap reel on the club’s official Instagram page.\nAcknowledge the sponsor during the closing ceremony.",
  obligations:"Provide approved brand assets before artwork goes to print.",
  flameContact:"Sports Department · sports@example.org", sponsorContact:"Event Partnerships · sponsor@example.org",
  flameSigner:"Example FLAME Representative", flameRole:"Director, Sports", secondSigner:"Example University Official", secondRole:"Registrar",
  sponsorSigner:"Example Sponsor Representative", sponsorRole:"Authorised signatory", copy:"Sports Department\nRegistrar’s Office\nAccounts Office"
};

export const hasCash = (data) => data.agreement === "stall" ? data.stallFee !== "waived" : data.type !== "kind";
const hasKind = (data) => data.agreement === "sponsor" && data.type !== "cash";

export function visible(field, data) {
  return (!field.cash || hasCash(data)) && (!field.kind || hasKind(data)) && (!field.waived || data.agreement === "stall" && data.stallFee === "waived")
    && (!field.sponsorOnly || data.agreement === "sponsor") && (!field.stallOnly || data.agreement === "stall")
    && (!field.food || data.foodActivity === "yes") && (!field.registered || data.gstStatus === "registered")
    && (!field.unregistered || data.gstStatus === "unregistered") && (!field.rated || ["exclusive", "inclusive", "reverse"].includes(data.tax))
    && (!field.schedules || field.schedules.includes(data.payment));
}
const lines = (value) => (value || "").split(/\r?\n/).map(line => line.trim()).filter(Boolean);
const amountInPaise = (value) => Math.round(Number(value) * 100);
export const inr = (amount) => new Intl.NumberFormat("en-IN", {style:"currency", currency:"INR"}).format(amount / 100);
const fmtDate = (value) => value ? new Intl.DateTimeFormat("en-IN", { dateStyle:"medium", timeZone:"UTC" }).format(new Date(value + "T00:00:00Z")) : "";
const rateLabel = (value) => String(Number(value)) + "%";
const cashValue = (value) => Number.isFinite(value) ? inr(value) : "[Amount]";

export function payment(data, amount = amountInPaise(data.amount)) {
  const rate = Number(data.rate);
  if (!data.amount || !data.tax || !Number.isFinite(amount)) return null;
  if (data.tax === "none") return { base:amount, gst:0, payable:amount };
  if (!data.rate || !Number.isFinite(rate)) return null;
  if (amount < 0 || rate < 0 || rate > 100) return null;
  const gst = data.tax === "inclusive" ? amount - Math.round(amount * 100 / (100 + rate)) : Math.round(amount * rate / 100);
  return {base: data.tax === "inclusive" ? amount - gst : amount, gst, payable: data.tax === "exclusive" ? amount + gst : amount};
}

export function validate(data) {
  const errors = new Map();
  steps.forEach(({fields}, step) => fields.filter(field => field.id && visible(field,data)).forEach(field => {
    const value = data[field.id];
    const add = (message) => errors.set(field.id, {step, message});
    if (field.required && (field.type === "checkbox" ? !value : !String(value ?? "").trim())) {
      add(field.type === "checkbox" ? "Confirm this check: " + field.label : field.label + " is required.");
    }
    else if (field.type === "number" && value !== "" && value != null && (
      !/^\d+(\.\d{1,2})?$/.test(String(value)) || Number(value) > field.max || (field.id !== "rate" && Number(value) <= 0)
    )) add("Enter a valid " + field.label.toLowerCase() + ".");
  }));
  const statutory = statutoryErrors(data);
  for (const [id, message] of statutory) errors.set(id, {step:steps.findIndex(step => step.fields.some(field => field.id === id)), message});
  if (data.start && data.end && data.end < data.start) errors.set("end", {step:0, message:"Event end must be on or after the start."});
  if (hasCash(data) && data.tax && data.tax !== "none" && !data.rate) errors.set("rate", {step:1,message:"Enter the confirmed GST rate."});
  if (hasCash(data) && data.payment === "split") {
    if (Number(data.first) >= Number(data.amount)) errors.set("first", {step:1,message:"The first instalment must be below the sponsorship amount."});
    if (data.due && data.due2 && data.due2 < data.due) errors.set("due2", {step:1,message:"The second instalment cannot fall before the first."});
  }
  if (data.secondSigner && !data.secondRole) errors.set("secondRole", {step:4,message:"Enter the additional FLAME signatory’s designation."});
  if (data.secondRole && !data.secondSigner) errors.set("secondSigner", {step:4,message:"Enter the additional FLAME signatory’s name."});
  return errors;
}

export function buildDocument(d, isExample = false) {
  const b = [];
  const add = (kind, content) => b.push({kind, content});
  const p = (s) => add("p", s);
  const h = (s) => add("h", s);
  const list = (s) => add("list", s);
  const table = (rows) => add("table", rows);
  const value = (id, fallback) => d[id] || "[" + fallback + "]";
  const event = value("event","Event name");
  const sponsor = value("sponsor","Sponsor legal name");
  const isStall = d.agreement === "stall";
  const start = fmtDate(d.start) || "[Event start]";
  const end = fmtDate(d.end) || "[Event end]";
  add("title", "Memorandum of Understanding");
  add("meta", (isExample ? "ILLUSTRATIVE EXAMPLE" : "DRAFT FOR REVIEW") + (d.version ? " · " + d.version : ""));
  p((isStall ? "Campus stall agreement for " : "Sports event sponsorship for ") + event);
  p("This Memorandum of Understanding (MoU) is made at " + value("city","Place of execution") + " between FLAME University (the First Party) and " + sponsor + (d.entity ? ", " + entities[d.entity] : "") + ", of " + value("address","Counterparty registered address") + (d.pinCode ? " " + d.pinCode.trim() : "") + " (the Second Party), together the Parties.");
  if (d.execution) p("Proposed execution date " + fmtDate(d.execution) + ".");
  if (d.tradeName) p("Trading as " + d.tradeName + ".");
  h("About FLAME University");
  p(value("flameAbout","University introduction"));
  h(isStall ? "About the stall operator" : "About the sponsoring body");
  p(value("sponsorAbout",isStall ? "Stall operator introduction" : "Sponsor introduction"));
  h("1. Event and duration");
  p((isStall ? "The stall agreement covers " : "The sponsorship covers ") + event + ", organised by " + value("organiser","Organising unit") + " at " + value("venue","Event venue") + ", " + (start === end ? "on " + start : "from " + start + " to " + end) + ".");
  if (d.eventAbout) p(d.eventAbout);
  if (isStall) p(value("stallDetails","Stall allocation and operating schedule"));
  p("This MoU takes effect on the date of the last authorised signature and applies to this event. It does not renew automatically. Payment, reporting and other obligations expressly due after the event remain payable or performable as agreed.");
  h("2. University responsibilities");
  p("FLAME University is responsible for organising and managing the event.");
  if (!isStall && d.tier) p("The sponsor will be recognised as " + d.tier + ".");
  list(lines(d.benefits).length ? lines(d.benefits) : ["[University deliverables]"]);
  h(isStall ? "3. Stall fee" : "3. Sponsorship contribution");
  if (hasCash(d)) {
    const totals = payment(d);
    if (totals) {
      const labels = {exclusive:"GST at " + rateLabel(d.rate) + " is added to the agreed amount.", inclusive:"The agreed amount includes GST at " + rateLabel(d.rate) + ".", reverse:"The sponsor shall account for applicable GST separately under reverse charge. The GST shown is excluded from the amount payable to FLAME University.", none:"No GST is charged on the payment as confirmed by Accounts."};
      p(labels[d.tax]);
      table([[isStall ? "Base fee" : "Base contribution", d.tax === "reverse" ? "GST under reverse charge" : "GST charged", "Payable to FLAME"], [inr(totals.base),inr(totals.gst),inr(totals.payable)]]);
    } else p("[Sponsorship amount and confirmed GST treatment]");
    if (d.payment === "custom") p(value("schedule","Custom payment schedule"));
    else if (d.payment === "split" && totals && d.first && Number(d.first) < Number(d.amount)) {
      const basis = amountInPaise(d.first);
      const first = d.tax === "exclusive" ? basis + Math.round(basis * Number(d.rate) / 100) : basis;
      table([["Instalment","Due date","Payable to FLAME"],["First",fmtDate(d.due) || "[First due date]",cashValue(first)],["Second",fmtDate(d.due2) || "[Second due date]",cashValue(totals.payable - first)]]);
    } else if (d.payment === "split") p("[Instalment amounts and due dates]");
    else p("The amount payable to FLAME University is due in one payment by " + (fmtDate(d.due) || "[Payment due date]") + ".");
    p(d.bank ? "Payment instructions\n" + d.bank : "Payment shall be made using the bank details communicated through the university’s official invoice or payment instructions.");
  }
  if (isStall && d.stallFee === "waived") p("The University has waived the stall fee. " + value("waiver","Waiver approval and basis"));
  if (hasKind(d)) p("In-kind contribution\n" + value("kind","In-kind goods or services and delivery terms"));
  h(isStall ? "4. Stall operator responsibilities" : "4. Sponsor responsibilities");
  const sponsorDuties = [
    "Provide a complete address, PAN details and the GST registration certificate where available.",
    "Cooperate with the University in coordinating the agreed sponsorship activities.",
    "Refrain from activities connected with the sponsorship that adversely affect the University’s reputation."
  ];
  if (d.campus) sponsorDuties.push("Do not bring non-vegetarian food, alcoholic beverages or smoking materials to the event.");
  list([...sponsorDuties, ...lines(d.obligations)]);
  if (isStall) p("Operate only within the allotted space, times and approved product list. Maintain hygiene, segregate waste, and return the stall in good condition. FLAME University may inspect and suspend stall operations for non-compliance.");
  const pan = normaliseId(d.pan);
  if (pan) p("PAN " + (d.includePan ? pan : "••••••" + pan.slice(-4)));
  if (d.gstStatus === "registered" && d.gstin) p("GSTIN " + normaliseId(d.gstin));
  if (d.gstStatus === "unregistered") p("The Second Party declares it is not registered under GST.");
  if (d.foodActivity === "yes") p("The Second Party shall ensure that " + value("foodOperator","Food business operator") + " maintains applicable food safety approvals for the approved activity. FSSAI registration or licence " + value("fssai","FSSAI number") + " valid through " + (fmtDate(d.fssaiExpiry) || "[Validity date]") + ". The University may suspend food service for non-compliance.");
  h("Restricted business declaration");
  p("The Second Party represents that it is not directly or indirectly engaged in, affiliated with, or acting on behalf of businesses involving tobacco, nicotine or vaping products, alcoholic beverages or liquor, illicit drugs or unauthorised trade in controlled substances, gambling, betting, casinos, real-money gaming, or other unlawful goods or services. This declaration applies to brands and partners it represents for this agreement.");
  p("The Second Party shall not use the event or university marks to promote these activities, including through surrogate branding. It shall promptly disclose any material change. FLAME University may suspend benefits or operations under this MoU or terminate it by written notice for a material breach or misrepresentation under this declaration.");
  h("5. Branding and use of materials");
  p("Each Party shall obtain the other Party’s written approval before using its name or marks in sponsorship materials. After termination or expiry, neither Party may use or adapt jointly owned works without the other Party’s written consent.");
  h("6. Termination and cancellation");
  p(value("termination","Agreed cancellation terms"));
  h("7. Force majeure");
  p("Neither Party is responsible for delay or failure caused by events beyond its reasonable control. The affected Party shall take reasonable steps to minimise the delay. If either Party remains unable to perform for 30 consecutive working days, this MoU terminates at the end of that period. Notice of termination shall be given within seven working days.");
  h("8. Confidentiality");
  p("Each Party shall use the other Party’s confidential information only to perform this MoU. Disclosure is permitted with prior written consent, to officials or advisers who need the information and are bound by confidentiality, or where required by law.");
  h("9. General provisions");
  p("The laws applicable in Maharashtra, India govern this MoU. The Parties shall first try in good faith to resolve disputes through their designated contacts. The competent courts at Pune shall have jurisdiction.");
  p("This MoU records the entire agreement and supersedes prior understandings on the same subject. Amendments require a written instrument signed by both Parties. Neither Party may assign its rights without the other Party’s written consent. If a provision is unenforceable, the remaining provisions continue in effect.");
  if (d.extra) { h("10. Additional agreed terms"); p(d.extra); }
  h("Designated contacts");
  table([["FLAME University", "Sponsor"], [value("flameContact","FLAME contact"),value("sponsorContact","Sponsor contact")]]);
  h("Authorised signatories");
  const signature = (name, role) => name + "\n" + role + "\n\nSignature ____________________\nDate ________________________";
  const signRows = [["For FLAME University","For " + sponsor],
    [signature(value("flameSigner","Name"),value("flameRole","Designation")),signature(value("sponsorSigner","Name"),value("sponsorRole","Designation"))]];
  if (d.secondSigner || d.secondRole) signRows.push([signature(value("secondSigner","Name"),value("secondRole","Designation")),""]);
  table(signRows);
  if (lines(d.copy).length) { h("Internal circulation"); list(lines(d.copy)); }
  return b;
}
