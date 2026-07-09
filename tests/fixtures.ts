// Hand-written miniature rosters mirroring the structure of New Recruit
// 11th edition exports (real exports are not committed; *.ros is gitignored).
// The .ros XML and the .json object describe the SAME list so the parsers
// can be checked for equivalence:
// - a character with an enhancement (nested pts cost) and wargear nested
//   inside other wargear (Weapon Rack > Rack Launcher)
// - a squad whose invulnerable save only exists as a unit-level Abilities
//   profile, present twice to exercise unit merging

function squadXml(prefix: string): string {
  return `
        <selection id="${prefix}" name="Test Squad" type="unit" from="entry" number="1">
          <profiles>
            <profile id="${prefix}a1" name="Squad Tactic" typeName="Abilities">
              <characteristics><characteristic name="Description">Squad tactic text</characteristic></characteristics>
            </profile>
            <profile id="${prefix}a2" name="Invulnerable Save" typeName="Abilities">
              <characteristics><characteristic name="Description">5+</characteristic></characteristics>
            </profile>
          </profiles>
          <selections>
            <selection id="${prefix}m1" name="Squad Trooper" type="model" from="group" number="4">
              <profiles>
                <profile id="${prefix}mp1" name="Test Squad" typeName="Unit">
                  <characteristics>
                    <characteristic name="M">6"</characteristic>
                    <characteristic name="T">4</characteristic>
                    <characteristic name="Sv">3+</characteristic>
                    <characteristic name="W">2</characteristic>
                    <characteristic name="LD">6+</characteristic>
                    <characteristic name="OC">2</characteristic>
                    <characteristic name="InSv">-</characteristic>
                  </characteristics>
                </profile>
              </profiles>
              <selections>
                <selection id="${prefix}w1" name="Boltgun" type="upgrade" from="group" number="4">
                  <profiles>
                    <profile id="${prefix}wp1" name="Boltgun" typeName="Ranged Weapons">
                      <characteristics>
                        <characteristic name="Range">24"</characteristic>
                        <characteristic name="A">2</characteristic>
                        <characteristic name="BS">3+</characteristic>
                        <characteristic name="S">4</characteristic>
                        <characteristic name="AP">0</characteristic>
                        <characteristic name="D">1</characteristic>
                        <characteristic name="Keywords">Rapid Fire 1</characteristic>
                      </characteristics>
                    </profile>
                  </profiles>
                </selection>
                <selection id="${prefix}w2" name="Combat Knife" type="upgrade" from="group" number="4">
                  <profiles>
                    <profile id="${prefix}wp2" name="Combat Knife" typeName="Melee Weapons">
                      <characteristics>
                        <characteristic name="Range">Melee</characteristic>
                        <characteristic name="A">3</characteristic>
                        <characteristic name="WS">3+</characteristic>
                        <characteristic name="S">4</characteristic>
                        <characteristic name="AP">0</characteristic>
                        <characteristic name="D">1</characteristic>
                        <characteristic name="Keywords">-</characteristic>
                      </characteristics>
                    </profile>
                  </profiles>
                </selection>
              </selections>
            </selection>
            <selection id="${prefix}m2" name="Squad Sergeant" type="model" from="group" number="1">
              <profiles>
                <profile id="${prefix}mp2" name="Test Squad" typeName="Unit">
                  <characteristics>
                    <characteristic name="M">6"</characteristic>
                    <characteristic name="T">4</characteristic>
                    <characteristic name="Sv">3+</characteristic>
                    <characteristic name="W">2</characteristic>
                    <characteristic name="LD">5+</characteristic>
                    <characteristic name="OC">2</characteristic>
                    <characteristic name="InSv">-</characteristic>
                  </characteristics>
                </profile>
              </profiles>
              <selections>
                <selection id="${prefix}w3" name="Combat Knife" type="upgrade" from="group" number="1">
                  <profiles>
                    <profile id="${prefix}wp3" name="Combat Knife" typeName="Melee Weapons">
                      <characteristics>
                        <characteristic name="Range">Melee</characteristic>
                        <characteristic name="A">3</characteristic>
                        <characteristic name="WS">3+</characteristic>
                        <characteristic name="S">4</characteristic>
                        <characteristic name="AP">0</characteristic>
                        <characteristic name="D">1</characteristic>
                        <characteristic name="Keywords">-</characteristic>
                      </characteristics>
                    </profile>
                  </profiles>
                </selection>
              </selections>
            </selection>
          </selections>
          <costs><cost name="pts" typeId="pts" value="85"/></costs>
          <categories><category id="${prefix}c1" name="Infantry" primary="true"/></categories>
        </selection>`
}

export const syntheticRosXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<roster id="test-roster" name="Synthetic Test List" battleScribeVersion="2.03" gameSystemName="Warhammer 40,000 11th Edition" xmlns="http://www.battlescribe.net/schema/rosterSchema">
  <costs><cost name="pts" typeId="pts" value="265"/></costs>
  <forces>
    <force id="f1" name="Army Roster" catalogueName="Test Faction">
      <rules>
        <rule id="ar1" name="Test Army Rule" hidden="false"><description>Army rule text</description></rule>
      </rules>
      <selections>
        <selection id="det" name="Detachment" type="upgrade" from="entry">
          <selections>
            <selection id="det1" name="Test Detachment" type="upgrade" from="group" group="Detachment">
              <rules><rule id="dr1" name="Detachment Rule" hidden="false"><description>Detachment rule text</description></rule></rules>
            </selection>
          </selections>
        </selection>
        <selection id="c1" name="Captain Testor" type="model" from="entry" number="1">
          <rules><rule id="ur1" name="Oath of Testing" hidden="false"><description>Unit rule text</description></rule></rules>
          <profiles>
            <profile id="cp1" name="Captain Testor" typeName="Unit">
              <characteristics>
                <characteristic name="M">6"</characteristic>
                <characteristic name="T">4</characteristic>
                <characteristic name="Sv">2+</characteristic>
                <characteristic name="W">5</characteristic>
                <characteristic name="LD">6+</characteristic>
                <characteristic name="OC">1</characteristic>
                <characteristic name="InSv">4+</characteristic>
              </characteristics>
            </profile>
            <profile id="cp2" name="Leader Ability" typeName="Abilities">
              <characteristics><characteristic name="Description">Leader ability text</characteristic></characteristics>
            </profile>
          </profiles>
          <selections>
            <selection id="w1" name="Test Pistol" type="upgrade" from="entry" number="1">
              <profiles>
                <profile id="wp1" name="Test Pistol" typeName="Ranged Weapons">
                  <characteristics>
                    <characteristic name="Range">12"</characteristic>
                    <characteristic name="A">1</characteristic>
                    <characteristic name="BS">2+</characteristic>
                    <characteristic name="S">4</characteristic>
                    <characteristic name="AP">-1</characteristic>
                    <characteristic name="D">2</characteristic>
                    <characteristic name="Keywords">Pistol</characteristic>
                  </characteristics>
                </profile>
              </profiles>
            </selection>
            <selection id="w2" name="Test Blade" type="upgrade" from="entry" number="1">
              <profiles>
                <profile id="wp2" name="Test Blade" typeName="Melee Weapons">
                  <characteristics>
                    <characteristic name="Range">Melee</characteristic>
                    <characteristic name="A">5</characteristic>
                    <characteristic name="WS">2+</characteristic>
                    <characteristic name="S">5</characteristic>
                    <characteristic name="AP">-2</characteristic>
                    <characteristic name="D">2</characteristic>
                    <characteristic name="Keywords">-</characteristic>
                  </characteristics>
                </profile>
              </profiles>
            </selection>
            <selection id="w3" name="Weapon Rack" type="upgrade" from="entry" number="1">
              <selections>
                <selection id="w4" name="Rack Launcher" type="upgrade" from="group" number="1">
                  <profiles>
                    <profile id="wp3" name="Rack Launcher" typeName="Ranged Weapons">
                      <characteristics>
                        <characteristic name="Range">24"</characteristic>
                        <characteristic name="A">D6</characteristic>
                        <characteristic name="BS">3+</characteristic>
                        <characteristic name="S">6</characteristic>
                        <characteristic name="AP">0</characteristic>
                        <characteristic name="D">1</characteristic>
                        <characteristic name="Keywords">Blast, Assault</characteristic>
                      </characteristics>
                    </profile>
                  </profiles>
                </selection>
              </selections>
            </selection>
            <selection id="e1" name="Test Enhancement" type="upgrade" from="entry" number="1">
              <costs><cost name="pts" typeId="pts" value="15"/></costs>
            </selection>
          </selections>
          <costs><cost name="pts" typeId="pts" value="80"/></costs>
          <categories>
            <category id="cat1" name="Character" primary="true"/>
            <category id="cat2" name="Epic Hero" primary="false"/>
          </categories>
        </selection>${squadXml('s1')}${squadXml('s2')}
      </selections>
    </force>
  </forces>
</roster>`

function profileJson(id: string, name: string, typeName: string, chars: Record<string, string>) {
  return {
    id,
    name,
    typeName,
    characteristics: Object.entries(chars).map(([charName, value]) => (
      { name: charName, typeId: charName, $text: value }
    ))
  }
}

function squadJson(prefix: string) {
  const trooperStats = { M: '6"', T: '4', Sv: '3+', W: '2', LD: '6+', OC: '2', InSv: '-' }
  const boltgun = { Range: '24"', A: '2', BS: '3+', S: '4', AP: '0', D: '1', Keywords: 'Rapid Fire 1' }
  const knife = { Range: 'Melee', A: '3', WS: '3+', S: '4', AP: '0', D: '1', Keywords: '-' }
  return {
    id: prefix,
    name: 'Test Squad',
    type: 'unit',
    from: 'entry',
    number: 1,
    profiles: [
      profileJson(`${prefix}a1`, 'Squad Tactic', 'Abilities', { Description: 'Squad tactic text' }),
      profileJson(`${prefix}a2`, 'Invulnerable Save', 'Abilities', { Description: '5+' })
    ],
    selections: [
      {
        id: `${prefix}m1`, name: 'Squad Trooper', type: 'model', from: 'group', number: 4,
        profiles: [profileJson(`${prefix}mp1`, 'Test Squad', 'Unit', trooperStats)],
        selections: [
          {
            id: `${prefix}w1`, name: 'Boltgun', type: 'upgrade', from: 'group', number: 4,
            profiles: [profileJson(`${prefix}wp1`, 'Boltgun', 'Ranged Weapons', boltgun)]
          },
          {
            id: `${prefix}w2`, name: 'Combat Knife', type: 'upgrade', from: 'group', number: 4,
            profiles: [profileJson(`${prefix}wp2`, 'Combat Knife', 'Melee Weapons', knife)]
          }
        ]
      },
      {
        id: `${prefix}m2`, name: 'Squad Sergeant', type: 'model', from: 'group', number: 1,
        profiles: [profileJson(`${prefix}mp2`, 'Test Squad', 'Unit', { ...trooperStats, LD: '5+' })],
        selections: [
          {
            id: `${prefix}w3`, name: 'Combat Knife', type: 'upgrade', from: 'group', number: 1,
            profiles: [profileJson(`${prefix}wp3`, 'Combat Knife', 'Melee Weapons', knife)]
          }
        ]
      }
    ],
    costs: [{ name: 'pts', typeId: 'pts', value: 85 }],
    categories: [{ id: `${prefix}c1`, name: 'Infantry', primary: true }]
  }
}

export const syntheticRosJson = JSON.stringify({
  roster: {
    id: 'test-roster',
    name: 'Synthetic Test List',
    battleScribeVersion: '2.03',
    gameSystemName: 'Warhammer 40,000 11th Edition',
    costs: [{ name: 'pts', typeId: 'pts', value: 265 }],
    forces: [
      {
        id: 'f1',
        name: 'Army Roster',
        catalogueName: 'Test Faction',
        rules: [{ id: 'ar1', name: 'Test Army Rule', hidden: false, description: 'Army rule text' }],
        selections: [
          {
            id: 'det', name: 'Detachment', type: 'upgrade', from: 'entry',
            selections: [
              {
                id: 'det1', name: 'Test Detachment', type: 'upgrade', from: 'group', group: 'Detachment',
                rules: [{ id: 'dr1', name: 'Detachment Rule', hidden: false, description: 'Detachment rule text' }]
              }
            ]
          },
          {
            id: 'c1', name: 'Captain Testor', type: 'model', from: 'entry', number: 1,
            rules: [{ id: 'ur1', name: 'Oath of Testing', hidden: false, description: 'Unit rule text' }],
            profiles: [
              profileJson('cp1', 'Captain Testor', 'Unit',
                { M: '6"', T: '4', Sv: '2+', W: '5', LD: '6+', OC: '1', InSv: '4+' }),
              profileJson('cp2', 'Leader Ability', 'Abilities', { Description: 'Leader ability text' })
            ],
            selections: [
              {
                id: 'w1', name: 'Test Pistol', type: 'upgrade', from: 'entry', number: 1,
                profiles: [profileJson('wp1', 'Test Pistol', 'Ranged Weapons',
                  { Range: '12"', A: '1', BS: '2+', S: '4', AP: '-1', D: '2', Keywords: 'Pistol' })]
              },
              {
                id: 'w2', name: 'Test Blade', type: 'upgrade', from: 'entry', number: 1,
                profiles: [profileJson('wp2', 'Test Blade', 'Melee Weapons',
                  { Range: 'Melee', A: '5', WS: '2+', S: '5', AP: '-2', D: '2', Keywords: '-' })]
              },
              {
                id: 'w3', name: 'Weapon Rack', type: 'upgrade', from: 'entry', number: 1,
                selections: [
                  {
                    id: 'w4', name: 'Rack Launcher', type: 'upgrade', from: 'group', number: 1,
                    profiles: [profileJson('wp3', 'Rack Launcher', 'Ranged Weapons',
                      { Range: '24"', A: 'D6', BS: '3+', S: '6', AP: '0', D: '1', Keywords: 'Blast, Assault' })]
                  }
                ]
              },
              {
                id: 'e1', name: 'Test Enhancement', type: 'upgrade', from: 'entry', number: 1,
                costs: [{ name: 'pts', typeId: 'pts', value: 15 }]
              }
            ],
            costs: [{ name: 'pts', typeId: 'pts', value: 80 }],
            categories: [
              { id: 'cat1', name: 'Character', primary: true },
              { id: 'cat2', name: 'Epic Hero', primary: false }
            ]
          },
          squadJson('s1'),
          squadJson('s2')
        ]
      }
    ]
  }
})
