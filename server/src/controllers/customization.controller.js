// Get all customization options (static data for now, can be moved to DB later)
const getCustomizationOptions = async (req, res) => {
  try {
    const customizationData = {
      photorealistic: {
        type: [
          { id: 'residential', name: 'RESIDENTIAL BUILDINGS' },
          { id: 'commercial', name: 'COMMERCIAL BUILDINGS' },
          { id: 'industrial', name: 'INDUSTRIAL BUILDINGS' },
          { id: 'institutional', name: 'INSTITUTIONAL BUILDINGS' },
          { id: 'recreational', name: 'RECREATIONAL BUILDINGS' },
          { id: 'agricultural', name: 'AGRICULTURAL BUILDINGS' },
          { id: 'government', name: 'GOVERNMENT BUILDINGS' },
          { id: 'religious', name: 'RELIGIOUS BUILDINGS' },
          { id: 'transportation', name: 'TRANSPORTATION BUILDINGS' },
          { id: 'multistory-office', name: 'MULTISTORY OFFICE BUILDING' }
        ],
        walls: {
          brick: [
            { 
              id: 'white-brick-clean', 
              name: 'White Brick Clean white appearance', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/brick/White%20Brick%20Clean%20white%20appearance.png' 
            },
            { 
              id: 'blue-brick-distinctive', 
              name: 'Blue Brick Distinctive blue shades', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/brick/Blue%20Brick%20Distinctive%20blue%20shades.png' 
            },
            { 
              id: 'brick-surface-stretcher', 
              name: 'brick surface in Stretcher Bond', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/brick/brick%20surface%20in%20Stretcher%20Bond.png' 
            },
            { 
              id: 'brown-brick-earthy', 
              name: 'Brown Brick Earthy brown tones', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/brick/Brown%20Brick%20Earthy%20brown%20tones.png' 
            },
            { 
              id: 'cream-brick-soft', 
              name: 'Cream Brick Soft', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/brick/Cream%20Brick%20Soft.png' 
            },
            { 
              id: 'gray-brick-neutral', 
              name: 'Gray Brick Neutral gray hue', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/brick/Gray%20Brick%20Neutral%20gray%20hue.png' 
            },
            { 
              id: 'green-brick-natural', 
              name: 'Green Brick Natural green tones with grey joints', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/brick/Green%20Brick%20Natural%20green%20tones%20with%20grey%20joints.png' 
            },
            { 
              id: 'rustic-charm-brick', 
              name: 'Rustic Charm brick with grey joints', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/brick/Rustic%20Charm%20brick%20with%20grey%20joints.png' 
            },
            { 
              id: 'simple-thinlayered-1', 
              name: 'Simple thinlayered exteriors brick_ ', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/brick/Simple%20thinlayered%20exteriors%20brick_%20.png' 
            },
            { 
              id: 'simple-thinlayered-2', 
              name: 'Simple thinlayered exteriors brick', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/brick/Simple%20thinlayered%20exteriors%20brick.png' 
            },
            { 
              id: 'tan-brick-light', 
              name: 'Tan Brick Light tan hue', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/brick/Tan%20Brick%20Light%20tan%20hue.png' 
            }
          ],
          ceramics: [
            { 
              id: 'crackled-aged', 
              name: 'Crackled Aged cracked ceramics', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/ceramics/Crackled%20Aged%20cracked%20ceramics.png' 
            },
            { 
              id: 'earthenware-traditional', 
              name: 'Earthenware Traditional rustic ceramics tiling', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/ceramics/Earthenware%20Traditional%20rustic%20ceramics%20tiling.png' 
            },
            { 
              id: 'glazed-shiny', 
              name: 'Glazed Shiny ceramics tiling', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/ceramics/Glazed%20Shiny%20ceramics%20tiling.png' 
            },
            { 
              id: 'handcrafted', 
              name: 'Handcrafted Artisan-made ceramics tiling', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/ceramics/Handcrafted%20Artisan-made%20ceramics%20tiling.png' 
            },
            { 
              id: 'matte-non-glossy', 
              name: 'Matte Non-glossy ceramics tiling', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/ceramics/Matte%20Non-glossy%20ceramics%20tiling.png' 
            },
            { 
              id: 'polished-smooth', 
              name: 'Polished Smooth glossy ceramics tiling', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/ceramics/Polished%20Smooth%20glossy%20ceramics%20tiling.png' 
            },
            { 
              id: 'porcelain-elegant', 
              name: 'Porcelain Elegant refined ceramics tiling', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/ceramics/Porcelain%20Elegant%20refined%20ceramics%20tiling.png' 
            },
            { 
              id: 'raku-colorful', 
              name: 'Raku Colorful unique ceramicstiling', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/ceramics/Raku%20Colorful%20unique%20ceramicstiling.png' 
            },
            { 
              id: 'terra-cotta-earthy', 
              name: 'Terra Cotta Earthy natural ceramics tiling', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/ceramics/Terra%20Cotta%20Earthy%20natural%20ceramics%20tiling.png' 
            }
          ],
          concrete: [
            { 
              id: 'brushed-concrete', 
              name: 'Brushed concrete', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/concrete/Brushed%20concrete.png' 
            },
            { 
              id: 'contemporary-polished', 
              name: 'Contemporary Polished concrete floors', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/concrete/Contemporary%20Polished%20concrete%20floors.png' 
            },
            { 
              id: 'corroded-weathered', 
              name: 'Corroded Weathered concrete components', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/concrete/Corroded%20Weathered%20concrete%20components.png' 
            },
            { 
              id: 'etched-acid-treated', 
              name: 'Etched Acid-treated concrete', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/concrete/Etched%20Acid-treated%20concrete.png' 
            },
            { 
              id: 'glossy-shiny-concrete', 
              name: 'Glossy Shiny concrete surfaces', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/concrete/Glossy%20Shiny%20concrete%20surfaces.png' 
            },
            { 
              id: 'matte-non-reflective', 
              name: 'Matte Non-reflective concrete finishes', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/concrete/Matte%20Non-reflective%20concrete%20finishes.png' 
            },
            { 
              id: 'modular', 
              name: 'Modular Prefabricated concrete panels', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/concrete/Modular%20Prefabricated%20concrete%20panels.png' 
            },
            { 
              id: 'polished-reflective', 
              name: 'Polished Reflective concrete surfaces', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/concrete/Polished%20Reflective%20concrete%20surfaces.png' 
            },
            { 
              id: 'soundproof', 
              name: 'Soundproof Noise-reducing concrete walls', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/concrete/Soundproof%20Noise-reducing%20concrete%20walls.png' 
            },
            { 
              id: 'weathered-aged', 
              name: 'Weathered Aged concrete finishes', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/concrete/Weathered%20Aged%20concrete%20finishes.png' 
            },
            { 
              id: 'industrial-exposed', 
              name: 'Industrial Exposed concrete walls', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/concrete/Industrial%20Exposed%20concrete%20walls.png' 
            },
            { 
              id: 'patinated-aged-concrete', 
              name: 'Patinated Aged concrete finishes', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/concrete/Patinated%20Aged%20concrete%20finishes.png' 
            },
            { 
              id: 'porous-permeable', 
              name: 'Porous Permeable concrete surfaces', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/concrete/Porous%20Permeable%20concrete%20surfaces.png' 
            }
          ],
          glass: [
            { 
              id: 'acid-etched-frosted', 
              name: 'Acid-Etched Frosted glass', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/glass/Acid-Etched%20Frosted%20glass.png' 
            },
            { 
              id: 'clear-transparent', 
              name: 'Clear Transparent glass', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/glass/Clear%20Transparent%20glass.png' 
            },
            { 
              id: 'frosted-translucent', 
              name: 'Frosted Translucent glass surfaces', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/glass/Frosted%20Translucent%20glass%20surfaces.png' 
            },
            { 
              id: 'laminated-layered', 
              name: 'Laminated Layered safety glass', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/glass/Laminated%20Layered%20safety%20glass.png' 
            },
            { 
              id: 'low-e-energy-efficient-1', 
              name: 'Low-E Energy-efficient glass', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/glass/Low-E%20Energy-efficient%20glass%20.png' 
            },
            { 
              id: 'low-e-energy-efficient-2', 
              name: 'Low-E Energy-efficient glass', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/glass/Low-E%20Energy-efficient%20glass.png' 
            },
            { 
              id: 'reflective-mirrored', 
              name: 'Reflective Mirrored glass', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/glass/Reflective%20Mirrored%20glass.png' 
            },
            { 
              id: 'tempered-strong', 
              name: 'Tempered Strong glass', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/glass/Tempered%20Strong%20glass.png' 
            },
            { 
              id: 'textured-etched', 
              name: 'Textured Etched glass', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/glass/Textured%20Etched%20glass.png' 
            },
            { 
              id: 'tinted-colored', 
              name: 'Tinted Colored panels glass', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/glass/Tinted%20Colored%20panels%20glass.png' 
            },
            { 
              id: 'double-skin-insulated', 
              name: 'Double-Skin Insulated glass', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/glass/Double-Skin%20Insulated%20glass.png' 
            },
            { 
              id: 'frameless-no-frame', 
              name: 'Frameless No-frame glass', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/glass/Frameless%20No-frame%20glass.png' 
            },
            { 
              id: 'modular-easy-assembly-1', 
              name: 'Modular Easy Assembly glass Systems ', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/glass/Modular%20Easy%20Assembly%20glass%20Systems%20.png' 
            },
            { 
              id: 'modular-easy-assembly-2', 
              name: 'Modular Easy Assembly', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/glass/Modular%20Easy%20Assembly.png' 
            },
            { 
              id: 'solar-control', 
              name: 'Solar-Control Sun-protective glass', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/glass/Solar-Control%20Sun-protective%20glass.png' 
            },
            { 
              id: 'tinted-sun-shade', 
              name: 'tinted sun-shade glass', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/glass/tinted%20sun-shade%20glass.png' 
            },
            { 
              id: 'translucent-glass', 
              name: 'translucent glass', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/glass/translucent%20glass.png' 
            }
          ],
          marble: [
            { 
              id: 'arabescato-marble-grey', 
              name: 'Arabescato Marble Grey patterns', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/marble/Arabescato%20Marble%20Grey%20patterns.png' 
            },
            { 
              id: 'blue-marble-blue-hues', 
              name: 'Blue Marble Blue hues', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/marble/Blue%20Marble%20Blue%20hues.png' 
            },
            { 
              id: 'carrara-calacatta', 
              name: 'Carrara Calacatta Marble Bold veining', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/marble/Carrara%20Calacatta%20Marble%20Bold%20veining.png' 
            },
            { 
              id: 'carrara-marble-white', 
              name: 'Carrara Marble White veins', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/marble/Carrara%20Marble%20White%20veins.png' 
            },
            { 
              id: 'crema-marfil-marble', 
              name: 'Crema Marfil Marble Cream-colored', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/marble/Crema%20Marfil%20Marble%20Cream-colored.png' 
            },
            { 
              id: 'emperador-marble-rich', 
              name: 'Emperador Marble Rich brown', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/marble/Emperador%20Marble%20Rich%20brown.png' 
            },
            { 
              id: 'nero-marquina', 
              name: 'Nero Marquina Marble Black veins', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/marble/Nero%20Marquina%20Marble%20Black%20veins.png' 
            },
            { 
              id: 'rosso-levanto-marble', 
              name: 'Rosso Levanto Marble Reddish-brown', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/marble/Rosso%20Levanto%20Marble%20Reddish-brown.png' 
            },
            { 
              id: 'statuario-marble-subtle', 
              name: 'Statuario Marble Subtle', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/marble/Statuario%20Marble%20Subtle.png' 
            }
          ],
          metal: [
            { 
              id: 'antiqued-aged-metal-1', 
              name: 'Antiqued Aged metal surfaces ', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/metal/Antiqued%20Aged%20metal%20surfaces%20.png' 
            },
            { 
              id: 'anodized', 
              name: 'Anodized Corrosion-resistant metal surfaces', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/metal/Anodized%20Corrosion-resistant%20metal%20surfaces.png' 
            },
            { 
              id: 'anodized-steel-surfaces', 
              name: 'Anodized steel surfaces', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/metal/Anodized%20steel%20surfaces.png' 
            },
            { 
              id: 'antiqued-aged-metal-2', 
              name: 'Antiqued Aged metal surfaces', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/metal/Antiqued%20Aged%20metal%20surfaces.png' 
            },
            { 
              id: 'brushed-metal', 
              name: 'Brushed metal', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/metal/Brushed%20metal.png' 
            },
            { 
              id: 'brushed-textured', 
              name: 'Brushed Textured metal', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/metal/Brushed%20Textured%20metal.png' 
            },
            { 
              id: 'corrugated-ribbed-metal', 
              name: 'Corrugated Ribbed metal', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/metal/Corrugated%20Ribbed%20metal.png' 
            },
            { 
              id: 'etched-decorative', 
              name: 'Etched Decorative metal patterns', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/metal/Etched%20Decorative%20metal%20patterns.png' 
            },
            { 
              id: 'galvanized-zinc-coated', 
              name: 'Galvanized Zinc-coated metal surfaces', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/metal/Galvanized%20Zinc-coated%20metal%20%20surfaces.png' 
            },
            { 
              id: 'hammered', 
              name: 'Hammered Rough-textured metal', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/metal/Hammered%20Rough-textured%20metal.png' 
            },
            { 
              id: 'perforated-ventilated', 
              name: 'Perforated Ventilated metal surfaces', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/metal/Perforated%20Ventilated%20metal%20surfaces.png' 
            },
            { 
              id: 'polished-mirror-like', 
              name: 'Polished Mirror-like metal finishes', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/metal/Polished%20Mirror-like%20metal%20finishes.png' 
            }
          ],
          plaster: [
            { 
              id: 'distressed-weathered', 
              name: 'Distressed Weathered plaster surface', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/plaster/Distressed%20Weathered%20plaster%20surface.png' 
            },
            { 
              id: 'lime-natural', 
              name: 'Lime Natural breathable plaster', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/plaster/Lime%20Natural%20breathable%20plaster.png' 
            },
            { 
              id: 'satin-soft', 
              name: 'Satin Soft plaster', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/plaster/Satin%20Soft%20plaster.png' 
            },
            { 
              id: 'smooth-sleek', 
              name: 'Smooth Sleek plaster', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/plaster/Smooth%20Sleek%20plaster.png' 
            },
            { 
              id: 'troweled-hand-applied', 
              name: 'Troweled Hand-applied textures', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/plaster/Troweled%20Hand-applied%20textures.png' 
            },
            { 
              id: 'venetian-polished', 
              name: 'Venetian Polished glossy plaster', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/plaster/Venetian%20Polished%20glossy%20plaster.png' 
            },
            { 
              id: 'marmorino-marble-like', 
              name: 'Marmorino Marble-like finishes', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/plaster/Marmorino%20Marble-like%20finishes.png' 
            },
            { 
              id: 'stucco-textured', 
              name: 'Stucco Textured plaster', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/plaster/Stucco%20Textured%20plaster.png' 
            },
            { 
              id: 'textured-rough-hewn', 
              name: 'Textured Rough-hewn finishes', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/plaster/Textured%20Rough-hewn%20finishes.png' 
            }
          ],
          steel: [
            { 
              id: 'anodized-treated-steel', 
              name: 'Anodized Treated steel', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/steel/Anodized%20Treated%20steel.png' 
            },
            { 
              id: 'brushed-textured-steel', 
              name: 'Brushed Textured steel', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/steel/Brushed%20Textured%20steel.png' 
            },
            { 
              id: 'corten-steel', 
              name: 'Corten steel', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/steel/corten%20steel.png' 
            },
            { 
              id: 'matte-non-reflective-steel', 
              name: 'Matte Non-reflective steel', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/steel/Matte%20Non-reflectiv%20steel.png' 
            },
            { 
              id: 'oxidized-patina-covered-steel', 
              name: 'Oxidized Patina-covered steel', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/steel/Oxidized%20Patina-covered%20steel.png' 
            },
            { 
              id: 'polished-smooth-steel', 
              name: 'Polished Smooth steel finishes', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/steel/Polished%20Smooth%20steel%20finishes.png' 
            }
          ],
          stone: [
            { 
              id: 'alabaster-translucent', 
              name: 'Alabaster Translucent', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/stone/Alabaster%20Translucent.png' 
            },
            { 
              id: 'artificial-engineered-stone', 
              name: 'Artificial Engineered stone tiles', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/stone/Artificial%20Engineered%20stone%20tiles.png' 
            },
            { 
              id: 'basalt-dark-surfaces', 
              name: 'Basalt Dark surfaces', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/stone/Basalt%20Dark%20surfaces.png' 
            },
            { 
              id: 'bluestone-blue-gray', 
              name: 'Bluestone Blue-gray materials', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/stone/Bluestone%20Blue-gray%20materials.png' 
            },
            { 
              id: 'carrara-polished-cast-stone', 
              name: 'Carrara polished Cast Stone Molded stone Facades tiles', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/stone/Carrara%20%20polished%20Cast%20Stone%20Molded%20stone%20Facades%20tiles.png' 
            },
            { 
              id: 'cast-stone-molded', 
              name: 'Cast Stone Molded stone Facades tiles', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/stone/Cast%20Stone%20Molded%20stone%20Facades%20tiles.png' 
            },
            { 
              id: 'coralstone-lightweight-materials', 
              name: 'Coralstone Lightweight stone materials', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/stone/Coralstone%20Lightweight%20stone%20materials.png' 
            },
            { 
              id: 'coralstone-lightweight', 
              name: 'Coralstone Lightweight', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/stone/Coralstone%20Lightweight.png' 
            },
            { 
              id: 'flat-polished-natural-stone', 
              name: 'Flat polished natural Stone tiles', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/stone/flat%20polished%20natural%20Stone%20tiles.png' 
            },
            { 
              id: 'gneiss-banded-stone', 
              name: 'Gneiss Banded stone', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/stone/Gneiss%20Banded%20stone.png' 
            },
            { 
              id: 'granite-polished', 
              name: 'Granite Polished', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/stone/Granite%20Polished.png' 
            },
            { 
              id: 'labradorite-iridescent', 
              name: 'Labradorite Iridescent stone', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/stone/Labradorite%20Iridescent%20stone.png' 
            },
            { 
              id: 'limestone-natural-flat', 
              name: 'Limestone Natural flat surface', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/stone/Limestone%20Natural%20flat%20surface.png' 
            },
            { 
              id: 'onyx-translucent-finishes', 
              name: 'Onyx Translucent finishes', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/stone/Onyx%20Translucent%20finishes.png' 
            },
            { 
              id: 'petrified-wood-fossilized', 
              name: 'Petrified Wood Fossilized', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/stone/Petrified%20Wood%20Fossilized.png' 
            },
            { 
              id: 'prefab-stone-components', 
              name: 'Prefab Stone Components', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/stone/Prefab%20Stone%20Components%20.png' 
            },
            { 
              id: 'quartz-stone-durable', 
              name: 'Quartz stone Durable finishes', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/stone/Quartz%20stone%20Durable%20finishes.png' 
            },
            { 
              id: 'quartzite-hard-materials', 
              name: 'Quartzite Hard materials', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/stone/Quartzite%20Hard%20materials.png' 
            },
            { 
              id: 'sandstone', 
              name: 'Sandstone', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/stone/Sandstone.png' 
            },
            { 
              id: 'schist-shiny-tiles', 
              name: 'Schist Shiny tiles', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/stone/Schist%20Shiny%20tiles.png' 
            }
          ],
          terrazzo: [
            { 
              id: 'epoxy-highly-polished', 
              name: 'Epoxy Highly polished seamless', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/terrazzo/Epoxy%20Highly%20polished%20seamless.png' 
            },
            { 
              id: 'standard-smooth-glossy', 
              name: 'Standard Smooth glossy finish', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/terrazzo/Standard%20Smooth%20glossy%20finish.png' 
            },
            { 
              id: 'terrazo-cementitious-sleek', 
              name: 'Terrazo Cementitious Sleek linear details', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/terrazzo/terrazo%20Cementitious%20Sleek%20linear%20details.png' 
            },
            { 
              id: 'terrazo-cementitious-smooth', 
              name: 'Terrazo Cementitious Smooth polished or matte photorealistic', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/terrazzo/terrazo%20Cementitious%20Smooth%20polished%20or%20matte%20photorealistic.png' 
            },
            { 
              id: 'terrazo-palladiana-smooth', 
              name: 'Terrazo Palladiana Smooth mosaic-like patterns', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/terrazzo/terrazo%20Palladiana%20Smooth%20%20mosaic-like%20patterns.png' 
            },
            { 
              id: 'terrazzo-composite-surfaces', 
              name: 'Terrazzo Composite surfaces', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/terrazzo/Terrazzo%20Composite%20surfaces.png' 
            },
            { 
              id: 'rustic-textured-non-slip', 
              name: 'Rustic Textured non-slip', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/terrazzo/Rustic%20Textured%20non-slip.png' 
            }
          ],
          wood: [
            { 
              id: 'brushed-textured-wood', 
              name: 'Brushed Textured wood grains', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/wood/Brushed%20Textured%20wood%20grains.png' 
            },
            { 
              id: 'carved-detailed-wooden', 
              name: 'Carved Detailed wooden trim', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/wood/Carved%20Detailed%20wooden%20trim.png' 
            },
            { 
              id: 'charred-burnt-wood', 
              name: 'Charred Burnt wood siding', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/wood/Charred%20Burnt%20wood%20siding.png' 
            },
            { 
              id: 'distressed-rough-wood', 
              name: 'Distressed Rough wood textures', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/wood/Distressed%20Rough%20wood%20textures.png' 
            },
            { 
              id: 'fine-grained-wood-veneer', 
              name: 'Fine-grained wood veneer', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/wood/Fine-grained%20wood%20veneer.png' 
            },
            { 
              id: 'hand-rubbed-polished-wood', 
              name: 'Hand-rubbed Polished wood surfaces', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/wood/Hand-rubbed%20Polished%20wood%20surfaces.png' 
            },
            { 
              id: 'horizontally-arranged-wood', 
              name: 'Horizontally arranged wood planks', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/wood/Horizontally%20arranged%20wood%20planks.png' 
            },
            { 
              id: 'industrial-exposed-timber', 
              name: 'Industrial Exposed timber facades', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/wood/Industrial%20Exposed%20timber%20facades.png' 
            },
            { 
              id: 'lacquered-durable-wood', 
              name: 'Lacquered Durable wood coatings', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/wood/Lacquered%20Durable%20wood%20coatings.png' 
            },
            { 
              id: 'lightly-painted-wood', 
              name: 'Lightly painted wood surfaces', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/wood/Lightly%20painted%20wood%20surfaces.png' 
            },
            { 
              id: 'matte-finished-wood', 
              name: 'Matte-finished Non-glossy wood surfaces', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/wood/Matte-finished%20Non-glossy%20wood%20surfaces.png' 
            },
            { 
              id: 'modern-clean-lined-wood', 
              name: 'Modern Clean-lined wood panels', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/wood/Modern%20Clean-lined%20wood%20panels.png' 
            },
            { 
              id: 'modern-minimal-clean-wood', 
              name: 'Modern minimal clean wood rafters', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/wood/modern%20minimal%20clean%20wood%20rafters.png' 
            },
            { 
              id: 'natural-unfinished-wood', 
              name: 'Natural Unfinished wood', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/wood/Natural%20Unfinished%20wood.png' 
            },
            { 
              id: 'organic-flowing-wood', 
              name: 'Organic Flowing wood elements', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/wood/Organic%20Flowing%20wood%20elements.png' 
            },
            { 
              id: 'reclaimed-wood-recycled', 
              name: 'Reclaimed wood Recycled accents', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/wood/Reclaimed%20wood%20Recycled%20accents.png' 
            },
            { 
              id: 'rustic-weathered-wood', 
              name: 'Rustic Weathered wood beams', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/wood/Rustic%20Weathered%20wood%20beams.png' 
            },
            { 
              id: 'satin-finished-wood', 
              name: 'Satin-finished Low-sheen wood surfaces', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/wood/Satin-finished%20Low-sheen%20wood%20surfaces.png' 
            },
            { 
              id: 'stained-richly-paneled-wood', 
              name: 'Stained Richly paneled wood', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/wood/Stained%20Richly%20paneled%20wood.png' 
            },
            { 
              id: 'varnished-glossy-wood', 
              name: 'Varnished Glossy wood', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/wood/Varnished%20Glossy%20wood.png' 
            },
            { 
              id: 'vertically-oriented-wood', 
              name: 'Vertically oriented wood slats', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/wood/Vertically%20oriented%20wood%20slats.png' 
            },
            { 
              id: 'weathered-aged-wood', 
              name: 'Weathered Aged wood siding', 
              imageUrl: 'https://prai-vision.s3.eu-central-1.amazonaws.com/customization-options/wood/Weathered%20Aged%20wood%20siding.png' 
            }
          ]
        },
        floors: {
          brick: [
            // Same as walls but for floors
          ],
          exterior: [
            { 
              id: 'cobblestone-pathway', 
              name: 'COBBLESTONE PATHWAY',
              description: 'STONES, GRAVEL, MOSS'
            },
            { 
              id: 'wooden-deck', 
              name: 'WOODEN DECK',
              description: 'WOOD PLANKS, RAILINGS, OUTDOOR FURNITURE'
            },
            { 
              id: 'stone-tiles', 
              name: 'STONE TILES',
              description: 'GRANITE, LIMESTONE, SIDEWALK'
            },
            { 
              id: 'concrete-pavement', 
              name: 'CONCRETE PAVEMENT',
              description: 'SMOOTH SURFACE, STREET, SIDEWALK'
            },
            { 
              id: 'terracotta-tiles', 
              name: 'TERRACOTTA TILES',
              description: 'RED CLAY, PATIO, OUTDOOR SPACE'
            },
            { 
              id: 'brick-road', 
              name: 'BRICK ROAD',
              description: 'BRICK PAVERS, PATHWAY, GARDEN EDGES'
            },
            { 
              id: 'gravel-driveway', 
              name: 'GRAVEL DRIVEWAY',
              description: 'LOOSE STONES, DIRT, EDGING'
            },
            { 
              id: 'tiled-terrace', 
              name: 'TILED TERRACE',
              description: 'CERAMIC TILES, OUTDOOR TABLE, CHAIRS'
            },
            { 
              id: 'artificial-grass', 
              name: 'ARTIFICIAL GRASS',
              description: 'SYNTHETIC TURF, LAWN, BACKYARD'
            },
            { 
              id: 'flagstone-path', 
              name: 'FLAGSTONE PATH',
              description: 'FLAT STONES, GARDEN, GREENERY'
            },
            { 
              id: 'wooden-boardwalk', 
              name: 'WOODEN BOARDWALK',
              description: 'PLANKS, SEASIDE, DECKING'
            },
            { 
              id: 'exposed-aggregate', 
              name: 'EXPOSED AGGREGATE',
              description: 'PEBBLES, CONCRETE, SIDEWALK'
            },
            { 
              id: 'bamboo-decking', 
              name: 'BAMBOO DECKING',
              description: 'WOODEN SLATS, BALCONY, OUTDOOR AREA'
            },
            { 
              id: 'stamped-concrete', 
              name: 'STAMPED CONCRETE',
              description: 'TEXTURED SURFACE, DRIVEWAY, PATIO'
            },
            { 
              id: 'paving-stones', 
              name: 'PAVING STONES',
              description: 'GRANITE, SLATE, DRIVEWAY'
            },
            { 
              id: 'asphalt-driveway', 
              name: 'ASPHALT DRIVEWAY',
              description: 'BLACKTOP, SMOOTH SURFACE, EDGING'
            },
            { 
              id: 'pebble-flooring', 
              name: 'PEBBLE FLOORING',
              description: 'ROUND STONES, COURTYARD, PATHWAY'
            },
            { 
              id: 'natural-stone-flooring', 
              name: 'NATURAL STONE FLOORING',
              description: 'SLATE, MARBLE, OUTDOOR PATIO'
            },
            { 
              id: 'sandstone-tiles', 
              name: 'SANDSTONE TILES',
              description: 'EARTH-TONED, TERRACE, COURTYARD'
            },
            { 
              id: 'concrete-slabs', 
              name: 'CONCRETE SLABS',
              description: 'LARGE PANELS, SIDEWALK, GARDEN PATH'
            },
            { 
              id: 'lawn-pathway', 
              name: 'LAWN PATHWAY',
              description: 'GRASS EDGING, STONE STEPS, GARDEN'
            },
            { 
              id: 'grass-lawn', 
              name: 'GRASS LAWN',
              description: 'GREEN LAWN, OUTDOOR AREA, RELAXING SPACE'
            },
            { 
              id: 'lawn-with-path', 
              name: 'LAWN WITH PATH',
              description: 'GRASS, STONES, WALKWAY'
            },
            { 
              id: 'garden-bed', 
              name: 'GARDEN BED',
              description: 'FLOWERS, PLANTS, NATURE'
            },
            { 
              id: 'rock-garden', 
              name: 'ROCK GARDEN',
              description: 'ROCKS, GRAVEL, SUCCULENTS'
            },
            { 
              id: 'pond', 
              name: 'POND',
              description: 'WATER, LILIES, REFLECTIONS'
            },
            { 
              id: 'fountain', 
              name: 'FOUNTAIN',
              description: 'WATER FEATURE, STATUES, SPLASHING'
            },
            { 
              id: 'swimming-pool', 
              name: 'SWIMMING POOL',
              description: 'WATER, TILES, RELAXATION'
            },
            { 
              id: 'beach-sand', 
              name: 'BEACH SAND',
              description: 'SAND, SHELLS, COASTLINE'
            },
            { 
              id: 'cliff-rocks', 
              name: 'CLIFF ROCKS',
              description: 'ROCK FORMATIONS, COASTLINE, DRAMATIC'
            },
            { 
              id: 'valley-meadow', 
              name: 'VALLEY MEADOW',
              description: 'GRASS, FLOWERS, ROLLING HILLS'
            },
            { 
              id: 'mountain-snow', 
              name: 'MOUNTAIN SNOW',
              description: 'SNOW-CAPPED PEAKS, COLD, WINTER'
            },
            { 
              id: 'desert-dunes', 
              name: 'DESERT DUNES',
              description: 'SAND DUNES, ARID, SUNSET'
            },
            { 
              id: 'tundra', 
              name: 'TUNDRA',
              description: 'GRASS, MOSS, COLD CLIMATE'
            },
            { 
              id: 'rainforest', 
              name: 'RAINFOREST',
              description: 'DENSE TREES, HUMID, NATURE'
            },
            { 
              id: 'savannah', 
              name: 'SAVANNAH',
              description: 'GRASSLAND, TREES, WILDLIFE'
            },
            { 
              id: 'wetlands', 
              name: 'WETLANDS',
              description: 'WATER, REEDS, ECOSYSTEM'
            },
            { 
              id: 'coral-reef', 
              name: 'CORAL REEF',
              description: 'UNDERWATER, CORALS, MARINE LIFE'
            },
            { 
              id: 'volcanic-landscape', 
              name: 'VOLCANIC LANDSCAPE',
              description: 'LAVA ROCKS, ASH, DRASTIC'
            },
            { 
              id: 'alien-planet', 
              name: 'ALIEN PLANET',
              description: 'OTHERWORLDLY, EXTRATERRESTRIAL'
            }
          ],
          // Add other floor materials...
        },
        context: [
          { id: 'urban-streets', name: 'URBAN STREETS' },
          { id: 'city-skyline', name: 'CITY SKYLINE' },
          { id: 'busy-downtown', name: 'BUSY DOWNTOWN' },
          // Add more context options...
        ],
        style: [
          { id: 'architectural-sculptural', name: 'ARCHITECTURAL SCULPTURAL' },
          { id: 'avant-garde', name: 'AVANT-GARDE INNOVATIVE' },
          { id: 'brutalist', name: 'BRUTALIST MASSIVE...' },
          // Add more style options...
        ],
        weather: [
          { 
            id: 'bright-clear-skies', 
            name: 'BRIGHT AND CLEAR SKIES',
            description: ''
          },
          { 
            id: 'sunny-day', 
            name: 'SUNNY DAY',
            description: ''
          },
          { 
            id: 'blue-sky-clouds', 
            name: 'BLUE SKY WITH SOME CLOUDS',
            description: ''
          },
          { 
            id: 'overcast-skies', 
            name: 'OVERCAST SKIES',
            description: ''
          },
          { 
            id: 'strong-winds', 
            name: 'STRONG WINDS BLOWING LEAVES',
            description: ''
          },
          { 
            id: 'light-haze', 
            name: 'LIGHT HAZE',
            description: ''
          },
          { 
            id: 'falling-rain', 
            name: 'FALLING RAIN',
            description: 'WITH WET SURFACES AND REFLECTIONS'
          },
          { 
            id: 'falling-snow', 
            name: 'FALLING SNOW',
            description: 'WITH A BLANKET OF WHITE COVERING THE GROUND'
          },
          { 
            id: 'frost-ice', 
            name: 'FROST AND ICE COVERING SURFACES',
            description: 'CREATE A COLD AND SLIPPERY ENVIRONMENT'
          },
          { 
            id: 'after-rainstorm', 
            name: 'CLEAR SKIES AFTER A RAINSTORM',
            description: 'WITH A COLORFUL SUNSET AND WET SURFACES'
          },
          { 
            id: 'colorful-rainbow', 
            name: 'A COLORFUL RAINBOW',
            description: 'ARCHING ACROSS THE SKY AFTER A RAIN SHOWER'
          }
        ],
        lighting: [
          { 
            id: 'natural-light', 
            name: 'NATURAL LIGHT',
            description: ''
          },
          { 
            id: 'warm-sunlight', 
            name: 'WARM SUNLIGHT JUST AFTER SUNRISE',
            description: ''
          },
          { 
            id: 'pale-moonlight', 
            name: 'PALE LIGHT FROM THE MOON',
            description: ''
          },
          { 
            id: 'soft-streetlights', 
            name: 'SOFT STREETLIGHTS',
            description: ''
          },
          { 
            id: 'spotlight-focused', 
            name: 'SPOTLIGHT FOCUSED',
            description: ''
          },
          { 
            id: 'sepia-muted', 
            name: 'SEPIA MUTED TONES',
            description: ''
          },
          { 
            id: 'golden-hour', 
            name: 'GOLDEN HOUR',
            description: ''
          },
          { 
            id: 'morning-sunbeams', 
            name: 'MORNING LIGHT SUNBEAMS',
            description: ''
          }
        ]
      },
      art: [
        { id: 'illustration', name: 'ILLUSTRATION' },
        { id: 'pen-ink', name: 'PEN AND INK' },
        { id: 'aquarelle', name: 'AQUARELLE' },
        { id: 'linocut', name: 'LINOCUT' },
        { id: 'collage', name: 'COLLAGE' },
        { id: 'fine-black-pen', name: 'FINE BLACK PEN' },
        { id: 'minimalist', name: 'MINIMALIST' },
        { id: 'avantgarde', name: 'AVANTGARDE' },
        { id: 'copic-pen', name: 'COPIC PEN' }
      ]
    };

    res.json(customizationData);
  } catch (error) {
    console.error('Get customization options error:', error);
    res.status(500).json({ message: 'Server error while fetching customization options' });
  }
};

module.exports = {
  getCustomizationOptions
};