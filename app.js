const form = document.querySelector("#form");
const resultBox = document.querySelector("#result");
let currentPackage;
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  data.includesMcp = form.elements.includesMcp.checked;
  const response = await fetch("/api/create", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
  currentPackage = await response.json();
  document.querySelector("#result-title").textContent = currentPackage.title;
  document.querySelector("#result-desc").textContent = currentPackage.description;
  document.querySelector("#file-list").innerHTML = Object.entries(currentPackage.files).map(([name, content]) => `<div class="file"><b></b><small></small></div>`).join("");
  [...document.querySelectorAll("#file-list .file")].forEach((row, i) => { const [name, content] = Object.entries(currentPackage.files)[i]; row.children[0].textContent = name; row.children[1].textContent = `${content.length.toLocaleString()} characters`; });
  resultBox.hidden = false;
  resultBox.scrollIntoView({ behavior: "smooth", block: "start" });
});
document.querySelector("#download").addEventListener("click", async () => {
  if (!currentPackage) return;
  const entries = Object.entries(currentPackage.files);
  const zipBlob = await createZip(entries);
  const link = document.createElement("a");
  link.href = URL.createObjectURL(zipBlob);
  link.download = `${currentPackage.slug}.zip`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
});
async function createZip(files) {
  // Small ZIP writer for UTF-8 text files; no third-party script or account is needed.
  const enc = new TextEncoder(); const local = []; const central = []; let offset = 0;
  const crcTable = Array.from({length:256}, (_,n)=>{let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
  const crc32 = bytes => {let c=0xffffffff;for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;};
  const put16=(a,n)=>{a.push(n&255,(n>>>8)&255);}; const put32=(a,n)=>{a.push(n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255);};
  for (const [name, text] of files) {
    const nb=enc.encode(name), data=enc.encode(text), crc=crc32(data); const head=[];
    put32(head,0x04034b50);put16(head,20);put16(head,0);put16(head,0);put16(head,0);put16(head,0);put32(head,crc);put32(head,data.length);put32(head,data.length);put16(head,nb.length);put16(head,0);
    local.push(new Uint8Array([...head,...nb,data]));
    const c=[];put32(c,0x02014b50);put16(c,20);put16(c,20);put16(c,0);put16(c,0);put16(c,0);put16(c,0);put32(c,crc);put32(c,data.length);put32(c,data.length);put16(c,nb.length);put16(c,0);put16(c,0);put16(c,0);put16(c,0);put32(c,0);put32(c,offset);
    central.push(new Uint8Array([...c,...nb]));offset+=head.length+nb.length+data.length;
  }
  const centralSize=central.reduce((n,a)=>n+a.length,0), end=[];put32(end,0x06054b50);put16(end,0);put16(end,0);put16(end,files.length);put16(end,files.length);put32(end,centralSize);put32(end,offset);put16(end,0);
  return new Blob([...local,...central,new Uint8Array(end)],{type:"application/zip"});
}
