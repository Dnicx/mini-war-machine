import sys
import os
from PyPDF2 import PdfReader
from pathlib import Path

# Get the project root (parent of scripts directory)
script_dir = Path(__file__).parent
project_root = script_dir.parent

source_dir = project_root / 'src' / 'stratagems' / 'source_pdf'
output_dir = project_root / 'tmp' / 'source_txt'

# Check if source directory exists
if not source_dir.exists():
    print(f'Source directory {source_dir} does not exist', file=sys.stderr)
    sys.exit(1)

# Create output directory if it doesn't exist
output_dir.mkdir(parents=True, exist_ok=True)

# Get all PDF files in the source directory
pdf_files = [f for f in os.listdir(source_dir) if f.endswith('.pdf')]

if not pdf_files:
    print(f'No PDF files found in {source_dir}', file=sys.stderr)
    sys.exit(1)

for pdf_file in pdf_files:
    pdf_path = source_dir / pdf_file
    # Create output filename based on PDF filename
    base_name = pdf_file.replace('.pdf', '')
    output_path = output_dir / f'extracted-{base_name}.txt'
    
    try:
        reader = PdfReader(pdf_path)
        full_text = ''
        
        for page_num, page in enumerate(reader.pages, 1):
            text = page.extract_text()
            full_text += f'--- Page {page_num} ---\n{text}\n\n'
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(full_text)
        
        print(f'PDF text extracted to {output_path}')
        print(f'Total pages: {len(reader.pages)}')
    except Exception as error:
        print(f'Error extracting PDF {pdf_file}: {error}', file=sys.stderr)
        continue
