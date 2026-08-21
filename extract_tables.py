from docx import Document
import json

files = [
    ("f:/1/夫/排盘-【阴盘-阳遁-5局】.docx", "f:/1/夫/阳遁5局_tables.json"),
    ("f:/1/夫/排盘-【阴盘-阴遁-5局】.docx", "f:/1/夫/阴遁5局_tables.json"),
]

for src, dst in files:
    print(f"Extracting tables from {src} ...")
    doc = Document(src)
    tables = []
    for ti, table in enumerate(doc.tables):
        rows = []
        for row in table.rows:
            cells = []
            for cell in row.cells:
                # Replace newlines/tabs with space for readability
                text = ' '.join(cell.text.split())
                cells.append(text)
            rows.append(cells)
        tables.append({"index": ti, "rows": rows})
    with open(dst, "w", encoding="utf-8") as f:
        json.dump(tables, f, ensure_ascii=False, indent=2)
    print(f"Saved {len(tables)} tables to {dst}")
