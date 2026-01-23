import docx
import os

def extract_content(docx_path, output_path):
    if not os.path.exists(docx_path):
        print(f"File not found: {docx_path}")
        return

    doc = docx.Document(docx_path)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        for element in doc.element.body:
            if element.tag.endswith('p'):
                para = docx.text.paragraph.Paragraph(element, doc)
                text = para.text.strip()
                if text:
                    f.write(text + "\n\n")
            elif element.tag.endswith('tbl'):
                table = docx.table.Table(element, doc)
                # Simple markdown table conversion
                rows = []
                for row in table.rows:
                    cells = [cell.text.strip().replace('\n', ' ') for cell in row.cells]
                    rows.append(cells)
                
                if rows:
                    # Header
                    header = rows[0]
                    f.write("| " + " | ".join(header) + " |\n")
                    f.write("| " + " | ".join(['---'] * len(header)) + " |\n")
                    # Body
                    for row in rows[1:]:
                        f.write("| " + " | ".join(row) + " |\n")
                f.write("\n")

if __name__ == "__main__":
    docx_path = r"d:/OneDrive - advantech/Project/Advantech WISE Devices System Log Analyzer/doc/WISE SysteM lOG整理.docx"
    output_path = r"d:/OneDrive - advantech/Project/Advantech WISE Devices System Log Analyzer/extracted_log_content.md"
    extract_content(docx_path, output_path)
