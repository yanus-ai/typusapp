const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedExteriorOptions() {
  console.log('🌱 Seeding Exterior material options...');

  try {
    // Find the Exterior material category (now global)
    const exteriorCategory = await prisma.materialCategory.findFirst({
      where: { slug: 'exterior' }
    });

    if (!exteriorCategory) {
      console.log('❌ Exterior material category not found. Please run wall materials seed first.');
      return;
    }

    // Check if Exterior options already exist
    const existingOptions = await prisma.materialOption.count({
      where: { categoryId: exteriorCategory.id }
    });

    if (existingOptions > 0) {
      console.log('✅ Exterior material options already exist, skipping...');
      return;
    }

    // Create Exterior material options
    const exteriorOptions = [
      {
        name: 'COBBLESTONE PATHWAY',
        slug: 'cobblestone-pathway-stones-gravel-moss',
        displayName: 'COBBLESTONE PATHWAY',
        description: 'STONES, GRAVEL, MOSS',
        orderIndex: 1
      },
      {
        name: 'WOODEN DECK',
        slug: 'wooden-deck-wood-planks-railings-outdoor-furniture',
        displayName: 'WOODEN DECK',
        description: 'WOOD PLANKS, RAILINGS, OUTDOOR FURNITURE',
        orderIndex: 2
      },
      {
        name: 'STONE TILES',
        slug: 'stone-tiles-granite-limestone-sidewalk',
        displayName: 'STONE TILES',
        description: 'GRANITE, LIMESTONE, SIDEWALK',
        orderIndex: 3
      },
      {
        name: 'CONCRETE PAVEMENT',
        slug: 'concrete-pavement-smooth-surface-street-sidewalk',
        displayName: 'CONCRETE PAVEMENT',
        description: 'SMOOTH SURFACE, STREET, SIDEWALK',
        orderIndex: 4
      },
      {
        name: 'TERRACOTTA TILES',
        slug: 'terracotta-tiles-red-clay-patio-outdoor-space',
        displayName: 'TERRACOTTA TILES',
        description: 'RED CLAY, PATIO, OUTDOOR SPACE',
        orderIndex: 5
      },
      {
        name: 'BRICK ROAD',
        slug: 'brick-road-brick-pavers-pathway-garden-edges',
        displayName: 'BRICK ROAD',
        description: 'BRICK PAVERS, PATHWAY, GARDEN EDGES',
        orderIndex: 6
      },
      {
        name: 'GRAVEL DRIVEWAY',
        slug: 'gravel-driveway-loose-stones-dirt-edging',
        displayName: 'GRAVEL DRIVEWAY',
        description: 'LOOSE STONES, DIRT, EDGING',
        orderIndex: 7
      },
      {
        name: 'TILED TERRACE',
        slug: 'tiled-terrace-ceramic-tiles-outdoor-table-chairs',
        displayName: 'TILED TERRACE',
        description: 'CERAMIC TILES, OUTDOOR TABLE, CHAIRS',
        orderIndex: 8
      },
      {
        name: 'ARTIFICIAL GRASS',
        slug: 'artificial-grass-synthetic-turf-lawn-backyard',
        displayName: 'ARTIFICIAL GRASS',
        description: 'SYNTHETIC TURF, LAWN, BACKYARD',
        orderIndex: 9
      },
      {
        name: 'FLAGSTONE PATH',
        slug: 'flagstone-path-flat-stones-garden-greenery',
        displayName: 'FLAGSTONE PATH',
        description: 'FLAT STONES, GARDEN, GREENERY',
        orderIndex: 10
      },
      {
        name: 'WOODEN BOARDWALK',
        slug: 'wooden-boardwalk-planks-seaside-decking',
        displayName: 'WOODEN BOARDWALK',
        description: 'PLANKS, SEASIDE, DECKING',
        orderIndex: 11
      },
      {
        name: 'EXPOSED AGGREGATE',
        slug: 'exposed-aggregate-pebbles-concrete-sidewalk',
        displayName: 'EXPOSED AGGREGATE',
        description: 'PEBBLES, CONCRETE, SIDEWALK',
        orderIndex: 12
      },
      {
        name: 'BAMBOO DECKING',
        slug: 'bamboo-decking-wooden-slats-balcony-outdoor-area',
        displayName: 'BAMBOO DECKING',
        description: 'WOODEN SLATS, BALCONY, OUTDOOR AREA',
        orderIndex: 13
      },
      {
        name: 'STAMPED CONCRETE',
        slug: 'stamped-concrete-textured-surface-driveway-patio',
        displayName: 'STAMPED CONCRETE',
        description: 'TEXTURED SURFACE, DRIVEWAY, PATIO',
        orderIndex: 14
      },
      {
        name: 'PAVING STONES',
        slug: 'paving-stones-granite-slate-driveway',
        displayName: 'PAVING STONES',
        description: 'GRANITE, SLATE, DRIVEWAY',
        orderIndex: 15
      },
      {
        name: 'ASPHALT DRIVEWAY',
        slug: 'asphalt-driveway-blacktop-smooth-surface-edging',
        displayName: 'ASPHALT DRIVEWAY',
        description: 'BLACKTOP, SMOOTH SURFACE, EDGING',
        orderIndex: 16
      },
      {
        name: 'PEBBLE FLOORING',
        slug: 'pebble-flooring-round-stones-courtyard-pathway',
        displayName: 'PEBBLE FLOORING',
        description: 'ROUND STONES, COURTYARD, PATHWAY',
        orderIndex: 17
      },
      {
        name: 'NATURAL STONE FLOORING',
        slug: 'natural-stone-flooring-slate-marble-outdoor-patio',
        displayName: 'NATURAL STONE FLOORING',
        description: 'SLATE, MARBLE, OUTDOOR PATIO',
        orderIndex: 18
      },
      {
        name: 'SANDSTONE TILES',
        slug: 'sandstone-tiles-earth-toned-terrace-courtyard',
        displayName: 'SANDSTONE TILES',
        description: 'EARTH-TONED, TERRACE, COURTYARD',
        orderIndex: 19
      },
      {
        name: 'CONCRETE SLABS',
        slug: 'concrete-slabs-large-panels-sidewalk-garden-path',
        displayName: 'CONCRETE SLABS',
        description: 'LARGE PANELS, SIDEWALK, GARDEN PATH',
        orderIndex: 20
      },
      {
        name: 'LAWN PATHWAY',
        slug: 'lawn-pathway-grass-edging-stone-steps-garden',
        displayName: 'LAWN PATHWAY',
        description: 'GRASS EDGING, STONE STEPS, GARDEN',
        orderIndex: 21
      },
      {
        name: 'GRASS LAWN',
        slug: 'grass-lawn-green-lawn-outdoor-area-relaxing-space',
        displayName: 'GRASS LAWN',
        description: 'GREEN LAWN, OUTDOOR AREA, RELAXING SPACE',
        orderIndex: 22
      },
      {
        name: 'LAWN WITH GRAVEL',
        slug: 'lawn-with-gravel-gravel-borders-green-lawn-backyard',
        displayName: 'LAWN WITH GRAVEL',
        description: 'GRAVEL BORDERS, GREEN LAWN, BACKYARD',
        orderIndex: 23
      }
    ];

    await prisma.materialOption.createMany({
      data: exteriorOptions.map(option => ({
        ...option,
        categoryId: exteriorCategory.id,
        isActive: true,
        tags: []
      }))
    });

    console.log('✅ Created Exterior material options');
    console.log('🎉 Exterior options seeded successfully!');

  } catch (error) {
    console.error('❌ Error seeding Exterior options:', error);
    throw error;
  }
}

module.exports = { seedExteriorOptions };