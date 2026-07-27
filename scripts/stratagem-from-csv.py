#!/usr/bin/env python3
"""
Extract stratagems for a given faction + detachment from Wahapedia's
Stratagems.csv export and print them as XML.

Usage:
	python stratagems_to_xml.py "Death Guard" Stratagems.csv /output_dir/
"""

import csv
import html
import re
import sys
import xml.etree.ElementTree as ET
import xml.dom.minidom as minidom
import os

# Faction name -> faction_id code, from Wahapedia's Factions.csv
FACTION_NAME_TO_ID = {
	"imperial agents": "AoI",
	"astra militarum": "AM",
	"genestealer cults": "GC",
	"necrons": "NEC",
	"aeldari": "AE",
	"adeptus titanicus": "TL",
	"orks": "ORK",
	"unaligned forces": "UN",
	"grey knights": "GK",
	"t'au empire": "TAU",
	"tau empire": "TAU",
	"leagues of votann": "LoV",
	"adeptus mechanicus": "AdM",
	"thousand sons": "TS",
	"death guard": "DG",
	"emperor's children": "EC",
	"world eaters": "WE",
	"chaos knights": "QT",
	"chaos daemons": "CD",
	"imperial knights": "QI",
	"space marines": "SM",
	"tyranids": "TYR",
	"adeptus custodes": "AC",
	"adepta sororitas": "AS",
	"chaos space marines": "CSM",
	"drukhari": "DRU",
	"unbound adversaries": "UA",
}


def strip_tags(text: str) -> str:
	"""Remove HTML tags and unescape entities."""
	text = re.sub(r"<[^>]+>", " ", text)
	text = html.unescape(text)
	text = re.sub(r"\s+", " ", text).strip()
	return text


def parse_description(description: str) -> dict:
	"""
	Wahapedia stratagem descriptions look like:
	<b>WHEN:</b> ...<br><br><b>TARGET:</b> ...<br><br><b>EFFECT:</b> ...
	optionally followed by <b>RESTRICTIONS:</b> ...
	Split on the bold labels and return {label: text}.
	"""
	parts = {}
	# Split on each "<b>LABEL:</b>" marker, keeping the label
	chunks = re.split(r"<b>\s*([A-Z]+)\s*:\s*</b>", description)
	# chunks[0] is anything before the first label (usually empty)
	for i in range(1, len(chunks), 2):
		label = chunks[i].strip().lower()
		text = chunks[i + 1] if i + 1 < len(chunks) else ""
		parts[label] = strip_tags(text)
	return parts


def load_stratagems(path: str):
	with open(path, encoding="utf-8-sig", newline="") as f:
		reader = csv.DictReader(f, delimiter="|")
		return [row for row in reader]


def main():


	if len(sys.argv) != 4:
		print(f"Usage: {sys.argv[0]} <faction name> <detachment name> <Stratagems.csv path>")
		sys.exit(1)

	faction_name, csv_path, output_path = sys.argv[1], sys.argv[2], sys.argv[3]

	faction_id = FACTION_NAME_TO_ID.get(faction_name.strip().lower())
	if faction_id is None:
		print(f"Unknown faction name: {faction_name!r}")
		print("Known factions:", ", ".join(sorted(n.title() for n in FACTION_NAME_TO_ID)))
		sys.exit(1)

	rows = load_stratagems(csv_path)

	matches = [
		row for row in rows
		if row.get("faction_id", "").strip() == faction_id
	]

	if not matches:
		print(f"No stratagems found for faction={faction_name!r}")
		sys.exit(1)

	root = ET.Element("stratagems")
	
	print(len( matches ))

	detachment_stratagem_map = {}

	for row in matches:
		name = row.get("name", "").strip()
		cp_cost = row.get("cp_cost", "").strip()
		legend = row.get("legend", "").strip()
		raw_type = row.get("type", "").strip()  # e.g. "Flyblown Host – Strategic Ploy Stratagem"
		description = row.get("description", "").strip()
		detachment = row.get("detachment", "").strip()

		# Split "<Detachment> – <Category> Stratagem" into type/subtype
		if "–" in raw_type:
			type_part, subtype_part = raw_type.split("–", 1)
		elif " - " in raw_type:
			type_part, subtype_part = raw_type.split(" - ", 1)
		else:
			type_part, subtype_part = row.get("detachment", ""), raw_type

		type_part = type_part.strip().upper()
		subtype_part = subtype_part.strip().upper()

		desc_parts = parse_description(description)

		strat_el = ET.SubElement(root, "stratagem")
		ET.SubElement(strat_el, "name").text = name
		ET.SubElement(strat_el, "cpCost").text = f"{cp_cost}CP" if cp_cost else ""
		ET.SubElement(strat_el, "type").text = type_part
		ET.SubElement(strat_el, "subtype").text = subtype_part
		ET.SubElement(strat_el, "lore").text = legend
		ET.SubElement(strat_el, "when").text = desc_parts.get("when", "")
		ET.SubElement(strat_el, "target").text = desc_parts.get("target", "")
		ET.SubElement(strat_el, "effect").text = desc_parts.get("effect", "")
		if "restrictions" in desc_parts:
			ET.SubElement(strat_el, "restrictions").text = desc_parts["restrictions"]



		rough_xml = ET.tostring(strat_el, encoding="unicode")
		pretty = minidom.parseString(rough_xml).toprettyxml(indent="  ")
		# drop the extra blank lines minidom tends to add
		# pretty = "\n".join(line for line in pretty.split("\n") if line.strip())
		# print(pretty)

		stratagems_list = detachment_stratagem_map.setdefault( detachment, list() )
		stratagems_list.append( pretty.split("\n", 1)[1] )
		print( 'detachment: ', detachment, 'name: ', name )

	for detachment, stratagem_list in detachment_stratagem_map.items():

		
		faction_folder_name = '_'.join( faction_name.lower().split(' ') )
		detachment_file_name = '_'.join( detachment.lower().split(' ') ) + '-stratagems' + '.xml'
		output_file_name = os.path.join( output_path, faction_folder_name, detachment_file_name )

		print( detachment_file_name, len( stratagem_list ) )

		with open( output_file_name , 'w', encoding="utf-8") as f:
			f.write( '<?xml version="1.0" ?>\n<stratagems>')
			for stratagem in stratagem_list:
				f.write( "\n".join(line for line in stratagem.split("\n") ) )
			f.write( "</stratagems>")


if __name__ == "__main__":
	main()