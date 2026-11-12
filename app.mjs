import {steps, defaults, example, visible, payment, inr, hasCash, validate, buildDocument} from "./model.mjs";
import {wordDocument} from "./word.mjs";
import {flameLogoUrl, pngAsset, sponsorLogoAsset, prepareSponsorLogo} from "./logos.mjs";

const storageKey = "flame-sports-mou-v1";
const $ = (id) => document.getElementById(id);
const form = $("draft");
let active = 0;
let data = {...defaults};
let isExample = false;
let errors = new Map();
let storageAvailable = true;
let logoRevision = 0;
let logoBusy = false;
let logoError = "";
let exporting = false;
let flameAsset;

try {
  const saved = JSON.parse(localStorage.getItem(storageKey));
  if (saved?.data) {
    data = {...defaults, ...saved.data};
    isExample = saved.isExample === true;
    active = steps[saved.active] ? saved.active : 0;
  }
} catch {
  storageAvailable = false;
}

function save() {
  try {
    localStorage.setItem(storageKey, JSON.stringify({data, isExample, active}));
    storageAvailable = true;
  } catch {
    storageAvailable = false;
  }
  $("save-status").textContent = storageAvailable ? (isExample ? "Illustrative example" : "Saved in this browser") : "Browser storage unavailable";
}
function node(tag, text, className) {
  const element = document.createElement(tag);
  if (text) element.textContent = text;
  if (className) element.className = className;
  return element;
}

function paintPreview() {
  const paper = $("paper");
  const fragment = document.createDocumentFragment();
  const header = node("header",null,"document-logos");
  const university = node("img",null,"flame-logo");
  university.src = flameLogoUrl.href;
  university.alt = "FLAME University logo";
  header.append(university);
  if (data.sponsorLogo) {
    const sponsor = node("img");
    sponsor.src = data.sponsorLogo;
    sponsor.alt = data.sponsor ? data.sponsor + " logo" : "Sponsor logo";
    header.append(sponsor);
  } else header.append(node("span","Sponsor logo","sponsor-placeholder"));
  fragment.append(header);
  for (const {kind, content} of buildDocument(data,isExample)) {
    if (kind === "list") {
      const list = node("ul");
      for (const entry of content) list.append(node("li",entry));
      fragment.append(list);
    } else if (kind === "table") {
      const table = node("table");
      const head = table.createTHead().insertRow();
      content[0].forEach(value => {
        const th = node("th",value);
        th.scope = "col";
        head.append(th);
      });
      const body = table.createTBody();
      content.slice(1).forEach(row => {
        const tr = body.insertRow();
        row.forEach(value => { tr.insertCell().textContent = value; });
      });
      fragment.append(table);
    } else {
      fragment.append(node({title:"h2", h:"h3", p:"p", meta:"p"}[kind],content, kind === "meta" ? "meta" : "preserve"));
    }
  }
  paper.replaceChildren(fragment);
  const summary = $("payment-summary");
  if (summary) {
    const value = hasCash(data) && payment(data);
    summary.hidden = !value;
    if (value) summary.textContent = inr(value.payable) + " payable to FLAME" +
      (data.tax === "reverse" ? " · " + inr(value.gst) + " GST payable separately by sponsor" : " · " + inr(value.gst) + " GST");
  }
}

function fieldControl(field) {
  const wrap = node("div",null,"field" + (field.full ? " full" : ""));
  const id = "field-" + field.id;
  const label = node("label",field.label);
  label.htmlFor = id;
  if (field.required) {
    const star = node("span","*","required");
    star.setAttribute("aria-hidden","true");
    label.append(star);
  }
  const input = node(field.options ? "select" : field.type === "textarea" ? "textarea" : "input");
  input.id = id;
  input.name = field.id;
  if (field.options) {
    for (const [value, title] of Object.entries(field.options)) input.add(new Option(title,value));
  } else if (field.type === "textarea") {
    input.rows = field.rows || 2;
    input.maxLength = 7000;
  } else {
    input.type = field.type || "text";
    if (input.type === "text") input.maxLength = 400;
    if (field.type === "number") {
      input.min = field.min;
      input.max = field.max;
      input.step = field.step;
    }
  }
  if (field.placeholder) input.placeholder = field.placeholder;
  input.required = !!field.required;
  if (field.type === "checkbox") input.checked = !!data[field.id];
  else input.value = data[field.id] ?? "";
  if (errors.has(field.id)) {
    input.setAttribute("aria-invalid","true");
    input.setAttribute("aria-describedby","errors");
  }
  wrap.append(label,input);
  if (["pan","gstin","fssai"].includes(field.id)) {
    input.autocomplete = "off";
    input.spellcheck = false;
  }
  if (field.id === "includePan") wrap.append(node("small","The PAN line is masked by default. A full GSTIN still contains the PAN."));
  if (field.id === "declared") wrap.append(node("small","Disclosed or unconfirmed involvement in any listed category puts the draft on hold."));
  if (field.id === "tax") wrap.append(node("small","The sponsor’s legal form alone does not determine reverse charge."));
  if (field.id === "amount") wrap.append(node("small","Enter the gross amount for GST-inclusive sponsorships and the base amount for other treatments."));
  if (field.id === "first") wrap.append(node("small","Use the same GST basis as the sponsorship amount."));
  if (field.id === "schedule") wrap.append(node("small","Specify the amounts payable to FLAME. Check that the instalments add up to the displayed total."));
  return wrap;
}

function sponsorLogoControl() {
  const wrap = node("div",null,"field full");
  const label = node("label","Sponsor logo (optional)");
  label.htmlFor = "field-sponsor-logo";
  const row = node("div",null,"logo-input");
  const input = node("input");
  input.id = label.htmlFor;
  input.type = "file";
  input.accept = "image/png,image/jpeg,image/webp";
  input.setAttribute("aria-describedby","sponsor-logo-status");
  const remove = node("button","Remove logo","outline");
  remove.type = "button";
  const status = node("small");
  status.id = "sponsor-logo-status";
  status.setAttribute("role","status");
  const sync = () => {
    status.textContent = logoError || (logoBusy ? "Preparing image…" : data.sponsorLogo ? "Logo added to this draft. Choose another image to replace it." : "PNG, JPEG or WebP up to 8 MB.");
    status.classList.toggle("logo-error",!!logoError);
    remove.hidden = !data.sponsorLogo;
    $("export").disabled = logoBusy || exporting;
  };
  input.addEventListener("change", async () => {
    const [file] = input.files;
    if (!file) return;
    const request = ++logoRevision;
    logoBusy = true;
    logoError = "";
    sync();
    try {
      const image = await prepareSponsorLogo(file);
      if (request !== logoRevision) return;
      data.sponsorLogo = image;
      paintPreview();
      save();
    } catch (error) {
      if (request !== logoRevision) return;
      logoError = error.message.startsWith("Choose ") ? error.message : "This image could not be opened. Choose another file.";
    } finally {
      if (request === logoRevision) {
        logoBusy = false;
        input.value = "";
        sync();
        if (!wrap.isConnected && $("field-sponsor-logo")) paintEditor();
      }
    }
  });
  remove.addEventListener("click", () => {
    logoRevision++;
    logoBusy = false;
    logoError = "";
    delete data.sponsorLogo;
    input.value = "";
    sync();
    input.focus();
    paintPreview();
    save();
  });
  sync();
  row.append(input,remove);
  wrap.append(label,row,status);
  return wrap;
}

function paintEditor() {
  const step = steps[active];
  $("steps").replaceChildren(...steps.map(({tab}, index) => {
    const button = node("button",tab,"step");
    button.type = "button";
    if (index === active) button.setAttribute("aria-current","step");
    button.addEventListener("click", () => go(index));
    return button;
  }));
  const title = node("h2",step.title,"section-title");
  title.tabIndex = -1;
  const fields = node("div",null,"fields");
  form.replaceChildren(title, node("p",step.hint,"hint"));
  const messages = [...errors.values()].filter(error => error.step === active).map(error => error.message);
  if (messages.length) {
    const box = node("p",messages.join(" "));
    box.id = "errors";
    box.setAttribute("role","alert");
    form.append(box);
  }
  for (const field of step.fields) {
    if (!visible(field,data)) continue;
    if (field.logo) fields.append(sponsorLogoControl());
    else if (field.summary) {
      const summary = node("div",null,"full");
      summary.id = "payment-summary";
      summary.hidden = true;
      fields.append(summary);
    } else if (field.links) {
      const links = node("div",null,"check-links full");
      for (const [label, href] of [
        ["Verify PAN","https://www.incometax.gov.in/iec/foportal/help/all-topics/e-filing-services/verify-your-pan"],
        ["Search GST taxpayer","https://services.gst.gov.in/services/searchtp"],
        ...(data.foodActivity === "yes" ? [["Check FSSAI record","https://foscos.fssai.gov.in/"]] : [])
      ]) {
        const link = node("a",label);
        link.href = href;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        links.append(link);
      }
      fields.append(links);
    } else if (field.heading) fields.append(node("h3",field.heading,"divider"));
    else fields.append(fieldControl(field));
  }
  form.append(fields);
  $("back").disabled = active === 0;
  $("next").textContent = active === steps.length - 1 ? "Review draft" : "Continue →";
  paintPreview();
}
function go(index) {
  active = index;
  paintEditor();
  save();
  form.querySelector("h2").focus();
}
function checkDraft() {
  errors = validate(data);
  if (!errors.size) return true;
  go(Math.min(...[...errors.values()].map(error => error.step)));
  form.querySelector('[aria-invalid="true"]')?.focus();
  return false;
}
form.addEventListener("submit", event => event.preventDefault());
form.addEventListener("input", event => {
  const input = event.target;
  if (!input.name || input.type === "file") return;
  const key = input.name;
  const newValue = input.type === "checkbox" ? input.checked : input.value;
  if (data[key] === newValue) return;
  data[key] = newValue;
  $("preview-label").textContent = "Updates as you edit";
  const reviews = {
    panVerified:["pan","entity","sponsor"],
    gstVerified:["gstin","gstStatus","pan","sponsor","entity"],
    identityVerified:["sponsor","entity","address","pinCode","sponsorSigner","sponsorRole"],
    fssaiVerified:["foodActivity","foodOperator","fssai","fssaiExpiry","start","end"],
    declared:["sponsor","sponsorAbout","tradeName","tobacco","alcohol","drugs","gambling","illegal"],
    accounts:["agreement","stallFee","waiver","type","amount","tax","rate","payment","first","due","due2","schedule","kind","gstStatus","gstin","entity"]
  };
  for (const [id, related] of Object.entries(reviews)) {
    if (!related.includes(key) || !data[id]) continue;
    data[id] = false;
    const control = $("field-" + id);
    if (control) control.checked = false;
  }
  if (errors.size) errors = validate(data);
  if (["agreement","foodActivity","type","payment","tax","gstStatus","stallFee"].includes(key)) {
    paintEditor();
    $(input.id)?.focus();
  } else {
    const box = $("errors");
    if (box) {
      const messages = [...errors.values()].filter(error => error.step === active).map(error => error.message);
      box.hidden = !messages.length;
      box.textContent = messages.join(" ");
      for (const control of form.elements) {
        if (errors.has(control.name)) {
          control.setAttribute("aria-invalid","true");
          control.setAttribute("aria-describedby","errors");
        } else {
          control.removeAttribute("aria-invalid");
          control.removeAttribute("aria-describedby");
        }
      }
    }
    paintPreview();
  }
  save();
});
$("back").addEventListener("click", () => go(active-1));
$("next").addEventListener("click", () => {
  if (active < steps.length - 1) go(active+1);
  else if (checkDraft()) {
    $("preview-label").textContent = "Required fields complete";
    $("export").focus();
  }
});
function replaceDraft(values, sample) {
  if (JSON.stringify(data) !== JSON.stringify(defaults) && !window.confirm("Replace the current draft in this browser?")) return;
  logoRevision++;
  logoBusy = false;
  logoError = "";
  data = {...values};
  isExample = sample;
  errors.clear();
  $("preview-label").textContent = "Updates as you edit";
  $("preview-scroll").scrollTop = 0;
  go(0);
}
$("sample").addEventListener("click", () => replaceDraft(example,true));
$("reset").addEventListener("click", () => replaceDraft(defaults,false));
$("export").addEventListener("click", async () => {
  if (logoBusy || exporting || !checkDraft()) return;
  const draft = data;
  const sample = isExample;
  const blocks = buildDocument(draft,sample);
  const type = draft.agreement === "stall" ? "FLAME-Stall-MoU" : "FLAME-Sponsorship-MoU";
  const name = draft.event.normalize("NFKD").replace(/[^a-z0-9]+/gi,"-").replace(/^-|-$/g,"").slice(0,90);
  exporting = true;
  $("export").disabled = true;
  try {
    const sponsor = draft.sponsorLogo ? sponsorLogoAsset(draft.sponsorLogo) : null;
    if (!flameAsset) {
      const response = await fetch(flameLogoUrl);
      if (!response.ok) throw new Error("FLAME logo unavailable");
      flameAsset = pngAsset(new Uint8Array(await response.arrayBuffer()),"FLAME University logo");
    }
    const url = URL.createObjectURL(wordDocument(blocks,{flame:flameAsset,sponsor}));
    const a = node("a");
    a.href = url;
    a.download = type + (sample ? "-EXAMPLE" : "") + (name ? "-" + name : "") + ".docx";
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url),30000);
  } catch {
    $("preview-label").textContent = "Word download failed. Please try again.";
  } finally {
    exporting = false;
    $("export").disabled = logoBusy;
  }
});
paintEditor();
save();
