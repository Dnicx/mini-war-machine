import re
import xml.etree.ElementTree as ET
from xml.dom import minidom
import os
import sys
from pathlib import Path

# Get the project root (parent of scripts directory)
script_dir = Path(__file__).parent
project_root = script_dir.parent

source_dir = project_root / 'tmp' / 'source_txt'
output_dir = project_root / 'src' / 'stratagems'

# Check if source directory exists
if not source_dir.exists():
    print(f'Error: Source directory {source_dir} does not exist. Run extract-pdf.py first.', file=sys.stderr)
    sys.exit(1)

# Get all extracted text files
extracted_files = [f for f in os.listdir(source_dir) if f.startswith('extracted-') and f.endswith('.txt')]

def split_by_pages(text):
    """Split text into pages based on '--- Page X ---' markers"""
    pages = {}
    page_pattern = r'--- Page (\d+) ---'
    
    matches = list(re.finditer(page_pattern, text))
    
    for i, match in enumerate(matches):
        page_num = int(match.group(1))
        start_pos = match.start()
        end_pos = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        page_text = text[start_pos:end_pos]
        pages[page_num] = page_text
    
    return pages

def detect_stratagem_pages(pages):
    """Automatically detect which pages contain stratagems"""
    stratagem_pages = {}
    
    for page_num, page_text in pages.items():
        # Check if page contains STRATAGEM keyword
        if 'STRATAGEM' in page_text:
            
            # Try to extract detachment name from the first stratagem on the page
            # Pattern: DETACHMENT – TYPE STRATAGEM (detachment is on the line before the stratagem name)
            # We need to find the line that contains "– STRATAGEM" and get the detachment name from it
            lines = page_text.split('\n')
            hyphensRegex = '–—‑-'
            for i, line in enumerate(lines):
                # Match multiple dash types: en dash (–), em dash (—), hyphen (-)
                # Pattern: DETACHMENT – STRATAGEM TYPE STRATAGEM
                print(f'  Checking line {i}: {line}')
                if re.search(fr'[{hyphensRegex}]\s*[A-Z\s]+\s*STRATAGEM', line):
                    print(f'  Found STRATAGEM on page {page_num}: {line}')
                    # Extract detachment name from this line
                    # Split on any dash type
                    parts = re.split(fr'[{hyphensRegex}]', line)
                    if len(parts) >= 2:
                        detachment_name = parts[0].strip()
                        stratagem_pages[page_num] = detachment_name
                        print(f'  Found stratagem page {page_num}: {detachment_name}')
                        break
    
    return stratagem_pages

def extract_stratagems_from_page(page_text, detachment_name):
    """Extract stratagems from a single page"""
    stratagems = []
    print(f'extracting stratagems from page {detachment_name}')
    
    # Pattern to match stratagem blocks
    # Match: NAME (case-insensitive with special chars) followed by DETACHMENT – TYPE STRATAGEM
    # Updated to handle special characters like apostrophes, hyphens, exclamation marks, etc.
    specialChar = r'\s–\'\-—‑’!,:\?'
    pattern = r'([A-Za-z][A-Za-z' + specialChar + r']{2,})\n([A-Z' + specialChar + r']+STRATAGEM)\n'
    
    matches = list(re.finditer(pattern, page_text))
    print(f'Found {len(matches)} matches')
    assert len(matches) > 0, f'No matches found on page {detachment_name}'
    
    # Extract all CP costs from the page (they often pool at the end)
    cp_costs = re.findall(r'(\d+CP)', page_text)
    
    for i, match in enumerate(matches):
        start_pos = match.start()
        end_pos = matches[i + 1].start() if i + 1 < len(matches) else len(page_text)
        block = page_text[start_pos:end_pos]
        
        # Extract name
        name = match.group(1).strip()
        
        # Extract type and subtype
        hyphensRegex = '–—‑-'
        type_line = match.group(2).strip()
        if re.search(fr'[{hyphensRegex}]', type_line):
            type_parts = re.split(fr'[{hyphensRegex}]', type_line)
            stratagem_type = type_parts[0].strip()
            subtype = type_parts[1].strip()
        else:
            raise ValueError(f'No hyphen found in type line: {type_line}')
        
        # Assign CP cost from the pooled list (in order of appearance)
        cp_cost = cp_costs[i] if i < len(cp_costs) else ''
        
        # Extract lore (text between type line and WHEN)
        lore_match = re.search(r'STRATAGEM\n(.*?)WHEN:', block, re.DOTALL)
        lore = lore_match.group(1).strip() if lore_match else ''
        
        # Extract WHEN
        when_match = re.search(r'WHEN:\s*(.*?)(?:TARGET:|EFFECT:|RESTRICTIONS:|$)', block, re.DOTALL)
        when = when_match.group(1).strip() if when_match else ''
        
        # Extract TARGET
        target_match = re.search(r'TARGET:\s*(.*?)(?:EFFECT:|RESTRICTIONS:|$)', block, re.DOTALL)
        target = target_match.group(1).strip() if target_match else ''
        
        # Extract EFFECT
        effect_match = re.search(r'EFFECT:\s*(.*?)(?:RESTRICTIONS:|$)', block, re.DOTALL)
        effect = effect_match.group(1).strip() if effect_match else ''
        
        # Clean up effect text - remove CP costs and page numbers that may have been included from page bottom
        # Remove all CP costs that appear at the end (including with newlines)
        effect = re.sub(r'(\d+CP[\s\n]*)+$', '', effect, flags=re.MULTILINE).strip()
        # Remove page numbers only if they appear on their own line at the end
        effect = re.sub(r'\n\s*\d+\s*$', '', effect, flags=re.MULTILINE).strip()
        # Remove any trailing whitespace/newlines
        effect = effect.strip()
        
        # Extract RESTRICTIONS (optional)
        restrictions_match = re.search(r'RESTRICTIONS:\s*(.*?)(?=$)', block, re.DOTALL)
        restrictions = restrictions_match.group(1).strip() if restrictions_match else ''
        
        # Validate required fields
        if not name or not effect or not when or not subtype:
            raise ValueError(f'Warning: Skipping stratagem with missing required fields (name: {name}, effect: {effect}, when: {when}, subtype: {subtype})')
            continue
        
        stratagems.append({
            'name': name,
            'cpCost': cp_cost,
            'type': detachment_name,
            'subtype': subtype,
            'lore': lore,
            'when': when,
            'target': target,
            'effect': effect,
            'restrictions': restrictions
        })
    
    return stratagems

def stratagems_to_xml(stratagems):
    root = ET.Element('stratagems')
    
    for s in stratagems:
        stratagem_elem = ET.SubElement(root, 'stratagem')
        
        ET.SubElement(stratagem_elem, 'name').text = s['name']
        ET.SubElement(stratagem_elem, 'cpCost').text = s['cpCost']
        ET.SubElement(stratagem_elem, 'type').text = s['type']
        ET.SubElement(stratagem_elem, 'subtype').text = s['subtype']
        ET.SubElement(stratagem_elem, 'lore').text = s['lore']
        ET.SubElement(stratagem_elem, 'when').text = s['when']
        if s['target']:
            ET.SubElement(stratagem_elem, 'target').text = s['target']
        ET.SubElement(stratagem_elem, 'effect').text = s['effect']
        if s['restrictions']:
            ET.SubElement(stratagem_elem, 'restrictions').text = s['restrictions']
    
    return root

def prettify_xml(elem):
    rough_string = ET.tostring(elem, encoding='unicode')
    reparsed = minidom.parseString(rough_string)
    return reparsed.toprettyxml(indent='  ')

def sanitize_filename(name):
    """Sanitize detachment name for use as filename"""
    return name.replace(' ', '_').replace("'", '').lower()

def extract_faction_name(file_path):
    """Extract faction name from file path"""
    # Pattern: extracted-eng_XX-XX_wh40k_faction_pack_{faction}-{hash}.txt
    match = re.search(r'faction[_-]pack[_-]([a-z_]+)', str(file_path).lower())
    if match:
        return match.group(1).replace('_', ' ')
    print(f'Warning: Could not extract faction name from {file_path}. Using "unknown".', file=sys.stderr)
    return 'unknown'


def main():
    total_stratagems = 0
    
    for extracted_file in extracted_files:
        file_path = source_dir / extracted_file
        faction_name = extract_faction_name(extracted_file)
        
        print(f'\nProcessing {extracted_file} ({faction_name})')
        
        with open(file_path, 'r', encoding='utf-8') as f:
            text = f.read()
        
        # Split text into pages
        pages = split_by_pages(text)
        
        # Automatically detect stratagem pages
        stratagem_pages = detect_stratagem_pages(pages)
        
        if not stratagem_pages:
            print(f'No stratagem pages found in {extracted_file}')
            continue
        
        print(f'Found {len(stratagem_pages)} stratagem pages')
        
        # Create faction-specific output directory
        faction_dir = output_dir / sanitize_filename(faction_name)
        faction_dir.mkdir(parents=True, exist_ok=True)
        
        faction_total = 0
        
        # Extract stratagems from each detachment page
        for page_num, detachment_name in stratagem_pages.items():
            if page_num not in pages:
                print(f'Warning: Page {page_num} not found')
                continue
            
            page_text = pages[page_num]
            stratagems = extract_stratagems_from_page(page_text, detachment_name)
            
            if not stratagems:
                print(f'No stratagems found on page {page_num} ({detachment_name})')
                continue
            
            # Create filename
            filename = sanitize_filename(detachment_name)
            output_file = faction_dir / f'{filename}-stratagems.xml'
            
            # Save to XML
            root = stratagems_to_xml(stratagems)
            xml_str = prettify_xml(root)
            
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(xml_str)
            
            print(f'  Extracted {len(stratagems)} stratagems from {detachment_name}')
            faction_total += len(stratagems)
        
        print(f'Total stratagems from {faction_name}: {faction_total}')
        total_stratagems += faction_total
    
    print(f'\n=== Total stratagems extracted across all factions: {total_stratagems} ===')

if __name__ == '__main__':
    main()
