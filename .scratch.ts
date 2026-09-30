import prisma from "./src/lib/prisma";
(async () => {
  const cat = await prisma.category.findUnique({ where: { slug: "stepper-motors" }, include: { children: true } });
  if (!cat) throw new Error("stepper missing");
  const ids = [cat.id, ...cat.children.map(c=>c.id)];
  const rows = await prisma.product.findMany({ where: { active: true, categoryId: { in: ids } }, select: { id:true, name:true, categoryId:true } });
  const motors: string[] = [], brackets: string[] = [], drives: string[] = [];
  for (const r of rows) {
    const n=r.name;
    if (n.startsWith("استپ درایو")) drives.push(n);
    else if (n.startsWith("براکت")) brackets.push(n);
    else motors.push(n);
  }
  console.log("MOTORS:", motors.length, "| BRACKETS:", brackets.length, "| DRIVES:", drives.length, "| TOTAL:", rows.length);
  const sframe: Record<string,number> = {}; const nmatch: Record<string,string> = {
    "42HS":"NEMA17 سایز42","57HS":"NEMA23 سایز57","57CM":"NEMA23 سایز57","CS-M223":"NEMA23 سایز57","3EO57":"NEMA23 سایز57",
    "60HS":"NEMA24 سایز60","60HSS":"NEMA24 سایز60","EC60":"NEMA24 سایز60",
    "86HS":"NEMA34 سایز86","86HSS":"NEMA34 سایز86","86CM":"NEMA34 سایز86","EC86":"NEMA34 سایز86","3EO86":"NEMA34 سایز86","3E086":"NEMA34 سایز86","86J":"NEMA34 سایز86","CS-M234":"NEMA34 سایز86",
    "110H3S":"NEMA42 سایز110","110HS":"NEMA42 سایز110","110J":"NEMA42 سایز110","130J":"NEMA52 سایز130",
  };
  let unkw: string[] = [];
  for (const n of motors) { let k:string|undefined; for (const [p,b] of Object.entries(nmatch)) if (n.includes(p)) { k=b; break; } if (k) sframe[k]=(sframe[k]||0)+1; else unkw.push(n); }
  for (const [k,v] of Object.entries(sframe).sort()) console.log(`  frame ${k}: ${v}`);
  unkw.forEach(n=>console.log("  UNMATCHED:", n.substring(0,90)));
  const dhyb=drives.filter(n=>/هیبرید|انکودردار|hybrid|سروو درایور/.test(n)).length;
  const d3ph=drives.filter(n=>/سه فاز/.test(n)).length;
  console.log(`  drives: hybrid=${dhyb} | 3phase=${d3ph} | plain=${drives.length-dhyb}`);
  await prisma.$disconnect();
})();
