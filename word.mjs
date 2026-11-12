const wordNS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const rels = "http://schemas.openxmlformats.org/package/2006/relationships";
const office = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/";
const drawing = "http://schemas.openxmlformats.org/drawingml/2006/";
const encoder = new TextEncoder();
const escapes = {"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&apos;"};
const xml = (s) => String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g,"").replace(/[&<>"']/g, char => escapes[char]);
const declaration = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const paragraph = (value, style = "Normal") => {
  const runs = String(value).split(/\r?\n/).map(line => '<w:t xml:space="preserve">' + xml(line) + '</w:t>').join("<w:br/>");
  return '<w:p><w:pPr><w:pStyle w:val="' + style + '"/></w:pPr><w:r>' + runs + '</w:r></w:p>';
};
const borders = ["top","left","bottom","right","insideH","insideV"].map(side => '<w:' + side + ' w:val="single" w:sz="5" w:color="B7C4D2"/>').join("");
function table(rows) {
  const width = Math.floor(9360 / rows[0].length);
  const cells = rows.map((row, index) => {
    const cellXml = row.map(value => '<w:tc><w:tcPr><w:tcW w:w="' + width + '" w:type="dxa"/>' +
      (index === 0 ? '<w:shd w:fill="EAF0F6"/>' : "") + '</w:tcPr>' + paragraph(value, index === 0 ? "TableHeader" : "TableText") + '</w:tc>').join("");
    return '<w:tr><w:trPr><w:cantSplit/>' + (index === 0 ? '<w:tblHeader/>' : "") + '</w:trPr>' + cellXml + '</w:tr>';
  }).join("");
  return '<w:tbl><w:tblPr><w:tblW w:w="9360" w:type="dxa"/><w:tblBorders>' + borders + '</w:tblBorders><w:tblLayout w:type="fixed"/>' +
    '<w:tblCellMar><w:top w:w="85" w:type="dxa"/><w:left w:w="110" w:type="dxa"/><w:bottom w:w="85" w:type="dxa"/><w:right w:w="110" w:type="dxa"/></w:tblCellMar></w:tblPr>' +
    '<w:tblGrid>' + rows[0].map(() => '<w:gridCol w:w="' + width + '"/>').join("") + '</w:tblGrid>' + cells + '</w:tbl>';
}
const style = (id, name, pPr, rPr, base = true) => '<w:style w:type="paragraph" w:styleId="' + id + '"' + (base ? '' : ' w:default="1"') + '><w:name w:val="' + name + '"/>' +
  (base ? '<w:basedOn w:val="Normal"/>' : '') + '<w:pPr>' + pPr + '</w:pPr><w:rPr>' + rPr + '</w:rPr></w:style>';
const spacing = (before, after) => '<w:spacing w:before="' + before + '" w:after="' + after + '" w:line="264" w:lineRule="auto"/>';
const size = (n) => '<w:sz w:val="' + n + '"/><w:szCs w:val="' + n + '"/>';
const styles = declaration + '<w:styles xmlns:w="' + wordNS + '">' + [
  style("Normal","Normal","<w:widowControl/>" + spacing(0,110),'<w:rFonts w:ascii="Cambria" w:hAnsi="Cambria"/>' + size(22),false),
  style("Title","Title",'<w:keepNext/>' + spacing(0,115) + '<w:jc w:val="center"/>','<w:b/><w:color w:val="000000"/>' + size(36)),
  style("DraftMeta","Draft metadata",'<w:keepNext/>' + spacing(0,220) + '<w:jc w:val="center"/>','<w:b/><w:color w:val="794122"/>' + size(18)),
  style("Heading1","heading 1",'<w:keepNext/><w:keepLines/>' + spacing(205,70) + '<w:outlineLvl w:val="0"/>','<w:b/>' + size(24)),
  style("BulletText","List Bullet",spacing(0,70) + '<w:ind w:left="420" w:hanging="250"/>',''),
  style("TableText","Table Text",spacing(0,0),''),
  style("TableHeader","Table Heading",'<w:keepNext/>' + spacing(0,0),'<w:b/>')
].join("") + '</w:styles>';

const crcTable = Uint32Array.from({length:256}, (_, byte) => {
  for (let bit = 0; bit < 8; bit++) byte = (byte >>> 1) ^ (byte & 1 ? 0xEDB88320 : 0);
  return byte;
});
function crc32(bytes) {
  let crc = 0xFFFFFFFF;
  for (const byte of bytes) crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 255];
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
function zip(files) {
  const chunks = [];
  const directory = [];
  let offset = 0;
  for (const [path, content] of Object.entries(files)) {
    const name = encoder.encode(path);
    const data = typeof content === "string" ? encoder.encode(content) : content;
    const crc = crc32(data);
    const local = new Uint8Array(30 + name.length);
    const central = new Uint8Array(46 + name.length);
    const header = new DataView(local.buffer);
    const entry = new DataView(central.buffer);
    header.setUint32(0, 0x04034b50, true);
    header.setUint16(4, 20, true);
    header.setUint16(12, 33, true);
    header.setUint32(14, crc, true);
    header.setUint32(18, data.length, true);
    header.setUint32(22, data.length, true);
    header.setUint16(26, name.length, true);
    local.set(name, 30);
    entry.setUint32(0, 0x02014b50, true);
    entry.setUint16(4, 20, true);
    entry.setUint16(6, 20, true);
    entry.setUint16(14, 33, true);
    entry.setUint32(16, crc, true);
    entry.setUint32(20, data.length, true);
    entry.setUint32(24, data.length, true);
    entry.setUint16(28, name.length, true);
    entry.setUint32(42, offset, true);
    central.set(name, 46);
    offset += local.length + data.length;
    chunks.push(local, data);
    directory.push(central);
  }
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, directory.length, true);
  end.setUint16(10, directory.length, true);
  end.setUint32(12, directory.reduce((sum, entry) => sum + entry.length, 0), true);
  end.setUint32(16, offset, true);
  return new Blob([...chunks, ...directory, end.buffer], {type:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"});
}
function imageDrawing(asset, id) {
  const scale = Math.min(1460500 / asset.width, 635000 / asset.height);
  const cx = Math.round(asset.width * scale);
  const cy = Math.round(asset.height * scale);
  const label = xml(asset.alt);
  return `<w:r><w:drawing><wp:inline><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${id}" name="${label}" descr="${label}"/>
    <a:graphic><a:graphicData uri="${drawing}picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${id}" name="${label}"/><pic:cNvPicPr/></pic:nvPicPr>
    <pic:blipFill><a:blip r:embed="rId${id}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>
    <pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>
    </pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
}

function logoHeader(flame, sponsor) {
  const cell = (alignment, content) => `<w:tc><w:tcPr><w:tcW w:w="4680" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>
    <w:p><w:pPr><w:spacing w:before="0" w:after="0"/><w:jc w:val="${alignment}"/></w:pPr>${content}</w:p></w:tc>`;
  const placeholder = '<w:r><w:rPr><w:i/><w:color w:val="536176"/><w:sz w:val="18"/></w:rPr><w:t>[Sponsor logo]</w:t></w:r>';
  return declaration + `<w:hdr xmlns:w="${wordNS}" xmlns:r="${office.slice(0,-1)}" xmlns:wp="${drawing}wordprocessingDrawing" xmlns:a="${drawing}main" xmlns:pic="${drawing}picture">
    <w:tbl><w:tblPr><w:tblW w:w="9360" w:type="dxa"/><w:tblLayout w:type="fixed"/></w:tblPr>
    <w:tblGrid><w:gridCol w:w="4680"/><w:gridCol w:w="4680"/></w:tblGrid>
    <w:tr>${cell("left",imageDrawing(flame,1))}${cell("right",sponsor ? imageDrawing(sponsor,2) : placeholder)}</w:tr></w:tbl></w:hdr>`;
}

const relationships = (entries) => declaration + '<Relationships xmlns="' + rels + '">' + entries.map(([id,type,target]) =>
  `<Relationship Id="rId${id}" Type="${office}${type}" Target="${target}"/>`).join("") + '</Relationships>';

export function wordDocument(blocks, {flame, sponsor}) {
  const content = blocks.map(({kind, content}) => {
    if (kind === "table") return table(content);
    if (kind === "list") return content.map(line => paragraph("•\t" + line,"BulletText").replace("•\t","•</w:t><w:tab/><w:t xml:space=\"preserve\">")).join("");
    return paragraph(content, {title:"Title", meta:"DraftMeta", h:"Heading1", p:"Normal"}[kind]);
  }).join("");
  const document = declaration + `<w:document xmlns:w="${wordNS}" xmlns:r="${office.slice(0,-1)}"><w:body>` + content +
    '<w:sectPr><w:headerReference w:type="default" r:id="rId2"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1510" w:right="1273" w:bottom="1120" w:left="1273" w:header="325" w:footer="480" w:gutter="0"/></w:sectPr></w:body></w:document>';
  const headerRels = [[1,"image","media/flame-logo.png"]];
  if (sponsor) headerRels.push([2,"image","media/sponsor-logo.png"]);
  return zip({
    "[Content_Types].xml":declaration + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/></Types>',
    "_rels/.rels":relationships([[1,"officeDocument","word/document.xml"]]),
    "word/_rels/document.xml.rels":relationships([[1,"styles","styles.xml"],[2,"header","header1.xml"]]),
    "word/_rels/header1.xml.rels":relationships(headerRels),
    "word/document.xml":document,
    "word/header1.xml":logoHeader(flame,sponsor),
    "word/styles.xml":styles,
    "word/media/flame-logo.png":flame.bytes,
    ...(sponsor ? {"word/media/sponsor-logo.png":sponsor.bytes} : {})
  });
}
