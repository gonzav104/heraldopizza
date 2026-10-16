// TEMPORARY prototype fixture for U2 (design system).
// Generated from docs/seed_catalogo.sql without changes; U1 replaces it with the typed mock repository.
// Do not edit by hand.
// imageUrl removed by owner decision D5.
import type { Category, Product } from '@/domain/catalog'

export const prototypeCategories: Category[] = [
  {
    "id": "9905ae9a-9374-55b3-b1ae-4435e5d036cf",
    "name": "Pizzas",
    "order": 1,
    "appliesDeliverySurcharge": true
  },
  {
    "id": "e4f5b25a-de7f-5c2e-a05f-071bcc5aa6d4",
    "name": "Empanadas",
    "order": 2,
    "appliesDeliverySurcharge": false
  },
  {
    "id": "8dcc19f4-ba04-5011-ab26-70fde499e583",
    "name": "Hamburguesas",
    "order": 3,
    "appliesDeliverySurcharge": false
  },
  {
    "id": "4aa1177e-f76f-5a3b-a44e-4bd5dfa94806",
    "name": "Milanesas y sándwiches",
    "order": 4,
    "appliesDeliverySurcharge": false
  },
  {
    "id": "a6ebfddc-c866-5621-a5d9-c66a3de040e3",
    "name": "Picadas",
    "order": 5,
    "appliesDeliverySurcharge": false
  },
  {
    "id": "c4136260-60b6-56ce-b366-d8f1ad699f55",
    "name": "Papas fritas",
    "order": 6,
    "appliesDeliverySurcharge": false
  },
  {
    "id": "3504ed22-1d58-54af-a88d-02f15d2030b0",
    "name": "Pastas",
    "order": 7,
    "appliesDeliverySurcharge": false
  },
  {
    "id": "ee5f58f0-c05a-4f31-afc9-3be05018d1d1",
    "name": "Postres",
    "order": 8,
    "appliesDeliverySurcharge": false
  },
  {
    "id": "e4c1bf3b-6e13-5b0b-b29e-8b487baa0367",
    "name": "Licuados",
    "order": 9,
    "appliesDeliverySurcharge": false
  },
  {
    "id": "433bf308-97f2-5e0c-ba6b-c50725d28756",
    "name": "Cafetería",
    "order": 10,
    "appliesDeliverySurcharge": false
  },
  {
    "id": "ec10f034-087b-5419-990c-e426b4a3cce4",
    "name": "Bebidas",
    "order": 11,
    "appliesDeliverySurcharge": false
  },
  {
    "id": "82afe4ba-fb2c-5e01-84e6-14047d225d44",
    "name": "Tragos clásicos",
    "order": 12,
    "appliesDeliverySurcharge": false
  },
  {
    "id": "f32b57aa-bda4-5781-9f6e-747f2f0bf95d",
    "name": "Tragos de autor",
    "order": 13,
    "appliesDeliverySurcharge": false
  }
]

export const prototypeProducts: Product[] = [
  {
    "id": "5ecbca90-722a-5ac5-958b-7c6535c58f0e",
    "categoryId": "9905ae9a-9374-55b3-b1ae-4435e5d036cf",
    "name": "Muzzarella",
    "description": "Salsa de tomate, muzzarella, orégano y aceitunas.",
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 1,
    "variants": [
      {
        "id": "5ecbca90-722a-5ac5-958b-7c6535c58f0e:1",
        "name": "Entera",
        "price": 16000
      },
      {
        "id": "5ecbca90-722a-5ac5-958b-7c6535c58f0e:2",
        "name": "Media",
        "price": 10500
      }
    ]
  },
  {
    "id": "067ddc9a-3c1e-5006-8d2e-b599fcede947",
    "categoryId": "9905ae9a-9374-55b3-b1ae-4435e5d036cf",
    "name": "Especial",
    "description": "Salsa de tomate, muzzarella, jamón cocido, orégano y aceitunas.",
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 2,
    "variants": [
      {
        "id": "067ddc9a-3c1e-5006-8d2e-b599fcede947:1",
        "name": "Entera",
        "price": 23600
      },
      {
        "id": "067ddc9a-3c1e-5006-8d2e-b599fcede947:2",
        "name": "Media",
        "price": 13500
      }
    ]
  },
  {
    "id": "80903e3a-1caf-5811-9900-6d34fff30c8f",
    "categoryId": "9905ae9a-9374-55b3-b1ae-4435e5d036cf",
    "name": "Napolitana",
    "description": "Salsa de tomate, muzzarella, tomates, pesto, queso sardo, orégano y aceitunas.",
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 3,
    "variants": [
      {
        "id": "80903e3a-1caf-5811-9900-6d34fff30c8f:1",
        "name": "Entera",
        "price": 23500
      },
      {
        "id": "80903e3a-1caf-5811-9900-6d34fff30c8f:2",
        "name": "Media",
        "price": 12500
      }
    ]
  },
  {
    "id": "9c7504d6-24e7-567f-babe-85917910e972",
    "categoryId": "9905ae9a-9374-55b3-b1ae-4435e5d036cf",
    "name": "Rúcula y Crudo",
    "description": "Salsa de tomate, muzzarella, jamón crudo, rúcula, parmesano, orégano y aceitunas.",
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 4,
    "variants": [
      {
        "id": "9c7504d6-24e7-567f-babe-85917910e972:1",
        "name": "Entera",
        "price": 27000
      },
      {
        "id": "9c7504d6-24e7-567f-babe-85917910e972:2",
        "name": "Media",
        "price": 14000
      }
    ]
  },
  {
    "id": "a8b7d780-f80d-58c4-8984-4d5dca7f89b9",
    "categoryId": "9905ae9a-9374-55b3-b1ae-4435e5d036cf",
    "name": "Cantimpalo",
    "description": "Salsa de tomate, muzzarella, cantimpalo, ajíes, orégano y aceitunas.",
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 5,
    "variants": [
      {
        "id": "a8b7d780-f80d-58c4-8984-4d5dca7f89b9:1",
        "name": "Entera",
        "price": 24000
      },
      {
        "id": "a8b7d780-f80d-58c4-8984-4d5dca7f89b9:2",
        "name": "Media",
        "price": 13500
      }
    ]
  },
  {
    "id": "e3991f3a-3d71-5d34-86b6-4b3c1f630aa5",
    "categoryId": "9905ae9a-9374-55b3-b1ae-4435e5d036cf",
    "name": "Roquefort",
    "description": "Salsa de tomate, muzzarella, queso roquefort, orégano y aceitunas.",
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 6,
    "variants": [
      {
        "id": "e3991f3a-3d71-5d34-86b6-4b3c1f630aa5:1",
        "name": "Entera",
        "price": 24000
      },
      {
        "id": "e3991f3a-3d71-5d34-86b6-4b3c1f630aa5:2",
        "name": "Media",
        "price": 12500
      }
    ]
  },
  {
    "id": "0613ae0c-e4b7-5f2d-a61d-8f82b93b17b2",
    "categoryId": "9905ae9a-9374-55b3-b1ae-4435e5d036cf",
    "name": "Salchipizza",
    "description": "Salsa de tomate, muzzarella, salchichas, cheddar, orégano y aceitunas.",
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 7,
    "variants": [
      {
        "id": "0613ae0c-e4b7-5f2d-a61d-8f82b93b17b2:1",
        "name": "Entera",
        "price": 25000
      },
      {
        "id": "0613ae0c-e4b7-5f2d-a61d-8f82b93b17b2:2",
        "name": "Media",
        "price": 13500
      }
    ]
  },
  {
    "id": "2e0d9305-bc8c-5b71-9c9b-1ed1fedbe493",
    "categoryId": "9905ae9a-9374-55b3-b1ae-4435e5d036cf",
    "name": "Fugazzeta 4 Quesos",
    "description": "Salsa de tomate, muzzarella, cebollas, parmesano, cheddar, roquefort, orégano y aceitunas.",
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 8,
    "variants": [
      {
        "id": "2e0d9305-bc8c-5b71-9c9b-1ed1fedbe493:1",
        "name": "Entera",
        "price": 29000
      },
      {
        "id": "2e0d9305-bc8c-5b71-9c9b-1ed1fedbe493:2",
        "name": "Media",
        "price": 14500
      }
    ]
  },
  {
    "id": "64b678d3-813f-5dec-8c5f-24d148447250",
    "categoryId": "9905ae9a-9374-55b3-b1ae-4435e5d036cf",
    "name": "Napolitana Heraldo",
    "description": "Salsa de tomate, muzzarella, jamón cocido, tomates, pesto, queso sardo, orégano y aceitunas.",
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 9,
    "variants": [
      {
        "id": "64b678d3-813f-5dec-8c5f-24d148447250:1",
        "name": "Entera",
        "price": 29000
      },
      {
        "id": "64b678d3-813f-5dec-8c5f-24d148447250:2",
        "name": "Media",
        "price": 14500
      }
    ]
  },
  {
    "id": "7649c11d-d1ea-591c-b8e8-c692d4107313",
    "categoryId": "9905ae9a-9374-55b3-b1ae-4435e5d036cf",
    "name": "4 Quesos",
    "description": "Salsa de tomate, muzzarella, parmesano, cheddar, roquefort, orégano y aceitunas.",
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 10,
    "variants": [
      {
        "id": "7649c11d-d1ea-591c-b8e8-c692d4107313:1",
        "name": "Entera",
        "price": 25000
      },
      {
        "id": "7649c11d-d1ea-591c-b8e8-c692d4107313:2",
        "name": "Media",
        "price": 13500
      }
    ]
  },
  {
    "id": "2453c6ac-e034-51dd-b98b-02d384c6f96e",
    "categoryId": "9905ae9a-9374-55b3-b1ae-4435e5d036cf",
    "name": "Palmitos",
    "description": "Salsa de tomate, muzzarella, jamón, palmitos, salsa golf, orégano y aceitunas.",
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 11,
    "variants": [
      {
        "id": "2453c6ac-e034-51dd-b98b-02d384c6f96e:1",
        "name": "Entera",
        "price": 24000
      },
      {
        "id": "2453c6ac-e034-51dd-b98b-02d384c6f96e:2",
        "name": "Media",
        "price": 13500
      }
    ]
  },
  {
    "id": "df9a5792-3f57-55d8-81b2-6d2f7fa3bd7b",
    "categoryId": "9905ae9a-9374-55b3-b1ae-4435e5d036cf",
    "name": "Americana",
    "description": "Salsa de tomate, muzzarella, papas fritas, cheddar, huevos fritos, orégano y aceitunas.",
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 12,
    "variants": [
      {
        "id": "df9a5792-3f57-55d8-81b2-6d2f7fa3bd7b:1",
        "name": "Entera",
        "price": 33000
      },
      {
        "id": "df9a5792-3f57-55d8-81b2-6d2f7fa3bd7b:2",
        "name": "Media",
        "price": 17000
      }
    ]
  },
  {
    "id": "906dde98-b6ca-5736-b837-9150f792b6bf",
    "categoryId": "9905ae9a-9374-55b3-b1ae-4435e5d036cf",
    "name": "Hongos",
    "description": "Salsa de tomate, muzzarella, champiñones, verdeo, morrón, orégano y aceitunas.",
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 13,
    "variants": [
      {
        "id": "906dde98-b6ca-5736-b837-9150f792b6bf:1",
        "name": "Entera",
        "price": 24000
      },
      {
        "id": "906dde98-b6ca-5736-b837-9150f792b6bf:2",
        "name": "Media",
        "price": 13500
      }
    ]
  },
  {
    "id": "b61eabbd-8756-5329-8e45-9ff6f0e457bd",
    "categoryId": "9905ae9a-9374-55b3-b1ae-4435e5d036cf",
    "name": "Fugazzeta",
    "description": "Salsa de tomate, muzzarella, cebolla, orégano y aceitunas.",
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 14,
    "variants": [
      {
        "id": "b61eabbd-8756-5329-8e45-9ff6f0e457bd:1",
        "name": "Entera",
        "price": 25000
      },
      {
        "id": "b61eabbd-8756-5329-8e45-9ff6f0e457bd:2",
        "name": "Media",
        "price": 13500
      }
    ]
  },
  {
    "id": "b928df01-19d8-5b9d-825d-d67caa900ec6",
    "categoryId": "9905ae9a-9374-55b3-b1ae-4435e5d036cf",
    "name": "Ananá y Jamón",
    "description": "Salsa de tomate, muzzarella, ananá, jamón, orégano y aceitunas.",
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 15,
    "variants": [
      {
        "id": "b928df01-19d8-5b9d-825d-d67caa900ec6:1",
        "name": "Entera",
        "price": 25000
      },
      {
        "id": "b928df01-19d8-5b9d-825d-d67caa900ec6:2",
        "name": "Media",
        "price": 13500
      }
    ]
  },
  {
    "id": "2943d324-58bc-5cbd-a2b7-9007b1486785",
    "categoryId": "9905ae9a-9374-55b3-b1ae-4435e5d036cf",
    "name": "Jamón y Morrón",
    "description": "Salsa de tomate, muzzarella, jamón, morrones, orégano y aceitunas.",
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 16,
    "variants": [
      {
        "id": "2943d324-58bc-5cbd-a2b7-9007b1486785:1",
        "name": "Entera",
        "price": 26000
      },
      {
        "id": "2943d324-58bc-5cbd-a2b7-9007b1486785:2",
        "name": "Media",
        "price": 13500
      }
    ]
  },
  {
    "id": "cb876675-e38f-5f11-a2e2-4ded013ad87b",
    "categoryId": "9905ae9a-9374-55b3-b1ae-4435e5d036cf",
    "name": "Humita",
    "description": "Salsa de tomate, muzzarella, choclo, jamón, morrones, orégano y aceitunas.",
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 17,
    "variants": [
      {
        "id": "cb876675-e38f-5f11-a2e2-4ded013ad87b:1",
        "name": "Entera",
        "price": 25000
      },
      {
        "id": "cb876675-e38f-5f11-a2e2-4ded013ad87b:2",
        "name": "Media",
        "price": 13500
      }
    ]
  },
  {
    "id": "f745d007-ea89-53e9-ad9b-c5959137b92e",
    "categoryId": "9905ae9a-9374-55b3-b1ae-4435e5d036cf",
    "name": "Anchoas",
    "description": "Salsa de tomate, muzzarella, anchoas, orégano y aceitunas.",
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 18,
    "variants": [
      {
        "id": "f745d007-ea89-53e9-ad9b-c5959137b92e:1",
        "name": "Entera",
        "price": 25000
      },
      {
        "id": "f745d007-ea89-53e9-ad9b-c5959137b92e:2",
        "name": "Media",
        "price": 13500
      }
    ]
  },
  {
    "id": "990dccf7-20ff-503b-ac5f-3a44f19f9242",
    "categoryId": "9905ae9a-9374-55b3-b1ae-4435e5d036cf",
    "name": "Cheddar y Panceta",
    "description": "Salsa de tomate, muzzarella, cheddar, panceta, orégano y aceitunas.",
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 19,
    "variants": [
      {
        "id": "990dccf7-20ff-503b-ac5f-3a44f19f9242:1",
        "name": "Entera",
        "price": 25000
      },
      {
        "id": "990dccf7-20ff-503b-ac5f-3a44f19f9242:2",
        "name": "Media",
        "price": 12500
      }
    ]
  },
  {
    "id": "3e57c43b-6d66-50dd-a6e2-cfb6b0617acb",
    "categoryId": "e4f5b25a-de7f-5c2e-a05f-071bcc5aa6d4",
    "name": "Empanada de carne picada",
    "description": null,
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 1,
    "variants": [
      {
        "id": "3e57c43b-6d66-50dd-a6e2-cfb6b0617acb:1",
        "name": "Unidad",
        "price": 3000
      }
    ]
  },
  {
    "id": "2a115259-a438-515f-9440-93292f8738d3",
    "categoryId": "e4f5b25a-de7f-5c2e-a05f-071bcc5aa6d4",
    "name": "Empanada de humita",
    "description": null,
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 2,
    "variants": [
      {
        "id": "2a115259-a438-515f-9440-93292f8738d3:1",
        "name": "Unidad",
        "price": 3000
      }
    ]
  },
  {
    "id": "f2200563-01fd-55ee-a50c-9fcb5081394f",
    "categoryId": "e4f5b25a-de7f-5c2e-a05f-071bcc5aa6d4",
    "name": "Empanada de pollo",
    "description": null,
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 3,
    "variants": [
      {
        "id": "f2200563-01fd-55ee-a50c-9fcb5081394f:1",
        "name": "Unidad",
        "price": 3000
      }
    ]
  },
  {
    "id": "f968d702-afdb-5874-b1c9-a5dbc27869ca",
    "categoryId": "e4f5b25a-de7f-5c2e-a05f-071bcc5aa6d4",
    "name": "Empanada de jamón y ananá",
    "description": null,
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 4,
    "variants": [
      {
        "id": "f968d702-afdb-5874-b1c9-a5dbc27869ca:1",
        "name": "Unidad",
        "price": 3000
      }
    ]
  },
  {
    "id": "ee4783c2-45bc-5fcf-bc44-92c3241f02d0",
    "categoryId": "e4f5b25a-de7f-5c2e-a05f-071bcc5aa6d4",
    "name": "Empanada de cebolla y queso",
    "description": null,
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 5,
    "variants": [
      {
        "id": "ee4783c2-45bc-5fcf-bc44-92c3241f02d0:1",
        "name": "Unidad",
        "price": 3000
      }
    ]
  },
  {
    "id": "ddb364ae-b725-5405-8122-9977d561fb35",
    "categoryId": "e4f5b25a-de7f-5c2e-a05f-071bcc5aa6d4",
    "name": "Empanada de roquefort y jamón",
    "description": null,
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 6,
    "variants": [
      {
        "id": "ddb364ae-b725-5405-8122-9977d561fb35:1",
        "name": "Unidad",
        "price": 3000
      }
    ]
  },
  {
    "id": "02ef512a-0d02-57f5-a15f-15f455052aaf",
    "categoryId": "e4f5b25a-de7f-5c2e-a05f-071bcc5aa6d4",
    "name": "Empanada de jamón y queso",
    "description": null,
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 7,
    "variants": [
      {
        "id": "02ef512a-0d02-57f5-a15f-15f455052aaf:1",
        "name": "Unidad",
        "price": 3000
      }
    ]
  },
  {
    "id": "92adf46e-c3cd-5f1b-8ebe-a00d297baed5",
    "categoryId": "e4f5b25a-de7f-5c2e-a05f-071bcc5aa6d4",
    "name": "Empanada de capresse",
    "description": null,
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 8,
    "variants": [
      {
        "id": "92adf46e-c3cd-5f1b-8ebe-a00d297baed5:1",
        "name": "Unidad",
        "price": 3000
      }
    ]
  },
  {
    "id": "618e6feb-2abe-58b2-b580-1ada980ec824",
    "categoryId": "e4f5b25a-de7f-5c2e-a05f-071bcc5aa6d4",
    "name": "Empanada de verdura",
    "description": null,
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 9,
    "variants": [
      {
        "id": "618e6feb-2abe-58b2-b580-1ada980ec824:1",
        "name": "Unidad",
        "price": 3000
      }
    ]
  },
  {
    "id": "ada34578-f5f6-5a22-866d-34692907d7a0",
    "categoryId": "e4f5b25a-de7f-5c2e-a05f-071bcc5aa6d4",
    "name": "Empanada de salchicha y cheddar",
    "description": null,
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 10,
    "variants": [
      {
        "id": "ada34578-f5f6-5a22-866d-34692907d7a0:1",
        "name": "Unidad",
        "price": 3000
      }
    ]
  },
  {
    "id": "a0049949-6aa1-5dca-a238-644725b2d984",
    "categoryId": "e4f5b25a-de7f-5c2e-a05f-071bcc5aa6d4",
    "name": "Docena surtida",
    "description": "12 empanadas con gustos surtidos que elige el local (no a elección).",
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 11,
    "variants": [
      {
        "id": "a0049949-6aa1-5dca-a238-644725b2d984:1",
        "name": "Docena",
        "price": 30000
      }
    ]
  },
  {
    "id": "c4f66321-8cbc-5323-9d7a-7e39e0d69b80",
    "categoryId": "8dcc19f4-ba04-5011-ab26-70fde499e583",
    "name": "Hamburguesa simple",
    "description": "Con jamón y queso.",
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 1,
    "variants": [
      {
        "id": "c4f66321-8cbc-5323-9d7a-7e39e0d69b80:1",
        "name": "Unidad",
        "price": 12500
      }
    ]
  },
  {
    "id": "2f7e3c05-bde1-5756-835d-87466ed96b58",
    "categoryId": "8dcc19f4-ba04-5011-ab26-70fde499e583",
    "name": "Hamburguesa completa",
    "description": "Con jamón, queso, tomate, rúcula y queso reggianito. Incluye papas fritas.",
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 2,
    "variants": [
      {
        "id": "2f7e3c05-bde1-5756-835d-87466ed96b58:1",
        "name": "Unidad",
        "price": 16500
      }
    ]
  },
  {
    "id": "0e3f60bc-f303-5874-a0b1-81710e58953d",
    "categoryId": "4aa1177e-f76f-5a3b-a44e-4bd5dfa94806",
    "name": "Milanesa al plato",
    "description": "Incluye papas fritas. Comen 2, pican 3.",
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 1,
    "variants": [
      {
        "id": "0e3f60bc-f303-5874-a0b1-81710e58953d:1",
        "name": "Napolitana",
        "price": 34000
      },
      {
        "id": "0e3f60bc-f303-5874-a0b1-81710e58953d:2",
        "name": "Cheddar, panceta y verdeo",
        "price": 34000
      },
      {
        "id": "0e3f60bc-f303-5874-a0b1-81710e58953d:3",
        "name": "Roquefort y jamón",
        "price": 34000
      },
      {
        "id": "0e3f60bc-f303-5874-a0b1-81710e58953d:4",
        "name": "Jamón y queso",
        "price": 34000
      }
    ]
  },
  {
    "id": "9a742d53-0850-5a95-b0d4-5622f77413aa",
    "categoryId": "4aa1177e-f76f-5a3b-a44e-4bd5dfa94806",
    "name": "Sándwich de milanesa XXL completo",
    "description": "45 cm. Jamón, queso, tomate, ajíes, morrones, rúcula y queso reggianito. Comen 2, pican 3.",
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 2,
    "variants": [
      {
        "id": "9a742d53-0850-5a95-b0d4-5622f77413aa:1",
        "name": "Sin papas fritas",
        "price": 28000
      },
      {
        "id": "9a742d53-0850-5a95-b0d4-5622f77413aa:2",
        "name": "Con papas fritas",
        "price": 34000
      }
    ]
  },
  {
    "id": "7e49cfc3-b571-51ce-9eed-df67414d18e7",
    "categoryId": "a6ebfddc-c866-5621-a5d9-c66a3de040e3",
    "name": "Tabla de fiambres",
    "description": "Jamón crudo, salame, queso sardo, tybo, roquefort, jamón cocido, mortadela, cantimpalo, maníes, aceitunas, pan de pizza y pan casero. Comen 3, pican 4.",
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 1,
    "variants": [
      {
        "id": "7e49cfc3-b571-51ce-9eed-df67414d18e7:1",
        "name": "Tabla",
        "price": 39000
      }
    ]
  },
  {
    "id": "d8a55214-fa21-5830-a189-20f3c8427e75",
    "categoryId": "a6ebfddc-c866-5621-a5d9-c66a3de040e3",
    "name": "Tabla de quesos",
    "description": "Roquefort, tybo, sardo, muzzarella, cheddar, aceitunas, maníes, papas pay, ajíes y panes. Comen 2, pican 3.",
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 2,
    "variants": [
      {
        "id": "d8a55214-fa21-5830-a189-20f3c8427e75:1",
        "name": "Tabla",
        "price": 30000
      }
    ]
  },
  {
    "id": "df59a8d6-7e9c-58e6-bfa4-2ec4cee8c0ac",
    "categoryId": "a6ebfddc-c866-5621-a5d9-c66a3de040e3",
    "name": "Picada Heraldo",
    "description": "Amplia variedad de fiambres, quesos, aceitunas y panes caseros. Comen 3, pican 4.",
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 3,
    "variants": [
      {
        "id": "df59a8d6-7e9c-58e6-bfa4-2ec4cee8c0ac:1",
        "name": "Tabla",
        "price": 40000
      }
    ]
  },
  {
    "id": "91612e06-4dff-575d-b895-5f7c2b5cb693",
    "categoryId": "c4136260-60b6-56ce-b366-d8f1ad699f55",
    "name": "Papas clásicas",
    "description": null,
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 1,
    "variants": [
      {
        "id": "91612e06-4dff-575d-b895-5f7c2b5cb693:1",
        "name": "Porción",
        "price": 10900
      }
    ]
  },
  {
    "id": "79d25cc9-f0c5-5c81-8787-0cbbf3e8a720",
    "categoryId": "c4136260-60b6-56ce-b366-d8f1ad699f55",
    "name": "Papas con cheddar",
    "description": null,
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 2,
    "variants": [
      {
        "id": "79d25cc9-f0c5-5c81-8787-0cbbf3e8a720:1",
        "name": "Porción",
        "price": 12500
      }
    ]
  },
  {
    "id": "32ddce80-e3f0-5b10-93b1-dc3f6edcfce7",
    "categoryId": "c4136260-60b6-56ce-b366-d8f1ad699f55",
    "name": "Papas con cheddar, panceta y verdeo",
    "description": null,
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 3,
    "variants": [
      {
        "id": "32ddce80-e3f0-5b10-93b1-dc3f6edcfce7:1",
        "name": "Porción",
        "price": 12500
      }
    ]
  },
  {
    "id": "ffa3a4fa-3f4b-5cd6-b3a7-4cb710e9dc38",
    "categoryId": "3504ed22-1d58-54af-a88d-02f15d2030b0",
    "name": "Ravioles con salsa boloñesa",
    "description": null,
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 1,
    "variants": [
      {
        "id": "ffa3a4fa-3f4b-5cd6-b3a7-4cb710e9dc38:1",
        "name": "Porción",
        "price": 18000
      }
    ]
  },
  {
    "id": "cc93f21b-bce1-5231-900a-e10b868fbd1d",
    "categoryId": "3504ed22-1d58-54af-a88d-02f15d2030b0",
    "name": "Ravioles parisienne",
    "description": "Crema, pollo, jamón y champiñones.",
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 2,
    "variants": [
      {
        "id": "cc93f21b-bce1-5231-900a-e10b868fbd1d:1",
        "name": "Porción",
        "price": 18000
      }
    ]
  },
  {
    "id": "0cb069ea-52f8-502d-bfeb-f8c84c6b291d",
    "categoryId": "3504ed22-1d58-54af-a88d-02f15d2030b0",
    "name": "Ravioles al verdeo",
    "description": "Salsa de crema de verdeo, suave y sabrosa.",
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 3,
    "variants": [
      {
        "id": "0cb069ea-52f8-502d-bfeb-f8c84c6b291d:1",
        "name": "Porción",
        "price": 18000
      }
    ]
  },
  {
    "id": "b9b2cec8-1905-49b2-bf31-4dec92aff650",
    "categoryId": "ee5f58f0-c05a-4f31-afc9-3be05018d1d1",
    "name": "Chocotorta",
    "description": null,
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 1,
    "variants": [
      {
        "id": "b9b2cec8-1905-49b2-bf31-4dec92aff650:1",
        "name": "Unidad",
        "price": 10500
      }
    ]
  },
  {
    "id": "89946ae4-4d46-466f-9b1a-17de813eb645",
    "categoryId": "ee5f58f0-c05a-4f31-afc9-3be05018d1d1",
    "name": "Vigilante",
    "description": null,
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 2,
    "variants": [
      {
        "id": "89946ae4-4d46-466f-9b1a-17de813eb645:1",
        "name": "Membrillo con queso",
        "price": 7500
      },
      {
        "id": "89946ae4-4d46-466f-9b1a-17de813eb645:2",
        "name": "Batata con queso",
        "price": 7500
      }
    ]
  },
  {
    "id": "7936e92b-ef72-4432-b26c-ff3c2a642020",
    "categoryId": "ee5f58f0-c05a-4f31-afc9-3be05018d1d1",
    "name": "Durazno con dulce de leche",
    "description": null,
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 3,
    "variants": [
      {
        "id": "7936e92b-ef72-4432-b26c-ff3c2a642020:1",
        "name": "Unidad",
        "price": 7000
      }
    ]
  },
  {
    "id": "64ed035e-5fa5-599f-98d7-7ab80a780101",
    "categoryId": "e4c1bf3b-6e13-5b0b-b29e-8b487baa0367",
    "name": "Licuado de banana",
    "description": "500 cc, con leche o con agua (indicarlo en la aclaración).",
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 1,
    "variants": [
      {
        "id": "64ed035e-5fa5-599f-98d7-7ab80a780101:1",
        "name": "500 cc",
        "price": 7500
      }
    ]
  },
  {
    "id": "0348fbb0-9437-5c9e-b99d-138286abf55c",
    "categoryId": "e4c1bf3b-6e13-5b0b-b29e-8b487baa0367",
    "name": "Licuado de frutilla",
    "description": "500 cc, con leche o con agua (indicarlo en la aclaración).",
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 2,
    "variants": [
      {
        "id": "0348fbb0-9437-5c9e-b99d-138286abf55c:1",
        "name": "500 cc",
        "price": 7500
      }
    ]
  },
  {
    "id": "4620d606-cc74-55dc-a334-04fff160240d",
    "categoryId": "e4c1bf3b-6e13-5b0b-b29e-8b487baa0367",
    "name": "Licuado de durazno",
    "description": "500 cc, con leche o con agua (indicarlo en la aclaración).",
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 3,
    "variants": [
      {
        "id": "4620d606-cc74-55dc-a334-04fff160240d:1",
        "name": "500 cc",
        "price": 7500
      }
    ]
  },
  {
    "id": "fbfef5c5-29fc-517a-b305-0ce356b92b14",
    "categoryId": "433bf308-97f2-5e0c-ba6b-c50725d28756",
    "name": "Café jarrito",
    "description": null,
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 1,
    "variants": [
      {
        "id": "fbfef5c5-29fc-517a-b305-0ce356b92b14:1",
        "name": "Unidad",
        "price": null
      }
    ]
  },
  {
    "id": "f83d2eac-a3a0-545e-a41f-d699720cb890",
    "categoryId": "433bf308-97f2-5e0c-ba6b-c50725d28756",
    "name": "Café cortado",
    "description": null,
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 2,
    "variants": [
      {
        "id": "f83d2eac-a3a0-545e-a41f-d699720cb890:1",
        "name": "Unidad",
        "price": null
      }
    ]
  },
  {
    "id": "1400ec0d-100a-50b5-acdd-3ecf2504eb4d",
    "categoryId": "433bf308-97f2-5e0c-ba6b-c50725d28756",
    "name": "Café lágrima",
    "description": null,
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 3,
    "variants": [
      {
        "id": "1400ec0d-100a-50b5-acdd-3ecf2504eb4d:1",
        "name": "Unidad",
        "price": null
      }
    ]
  },
  {
    "id": "a2e8ffe9-68ec-5282-baee-8aade8ee3dd3",
    "categoryId": "433bf308-97f2-5e0c-ba6b-c50725d28756",
    "name": "Café chico",
    "description": null,
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 4,
    "variants": [
      {
        "id": "a2e8ffe9-68ec-5282-baee-8aade8ee3dd3:1",
        "name": "Unidad",
        "price": null
      }
    ]
  },
  {
    "id": "181f267a-90f3-5db9-bd1d-7730cb1041bd",
    "categoryId": "433bf308-97f2-5e0c-ba6b-c50725d28756",
    "name": "Medialunas",
    "description": null,
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 5,
    "variants": [
      {
        "id": "181f267a-90f3-5db9-bd1d-7730cb1041bd:1",
        "name": "Unidad",
        "price": null
      }
    ]
  },
  {
    "id": "1c5c2c20-2320-5c13-88da-072dce38a2a6",
    "categoryId": "433bf308-97f2-5e0c-ba6b-c50725d28756",
    "name": "Tostado de pan de pizza XXL",
    "description": null,
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 6,
    "variants": [
      {
        "id": "1c5c2c20-2320-5c13-88da-072dce38a2a6:1",
        "name": "Unidad",
        "price": 15000
      }
    ]
  },
  {
    "id": "f3d8ce06-27aa-584d-b932-92289a17c6c8",
    "categoryId": "433bf308-97f2-5e0c-ba6b-c50725d28756",
    "name": "Ensaimada",
    "description": null,
    "madeToOrderNotice": "Por encargo: pedir con 1 o 2 días de anticipación.",
    "inStock": true,
    "order": 7,
    "variants": [
      {
        "id": "f3d8ce06-27aa-584d-b932-92289a17c6c8:1",
        "name": "Mediana",
        "price": 25000
      },
      {
        "id": "f3d8ce06-27aa-584d-b932-92289a17c6c8:2",
        "name": "Grande",
        "price": 35000
      }
    ]
  },
  {
    "id": "31de0469-5342-565c-be0d-03783e632194",
    "categoryId": "ec10f034-087b-5419-990c-e426b4a3cce4",
    "name": "Coca-Cola 1,75 L",
    "description": null,
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 1,
    "variants": [
      {
        "id": "31de0469-5342-565c-be0d-03783e632194:1",
        "name": "Unidad",
        "price": 9500
      }
    ]
  },
  {
    "id": "ad246dd8-7505-52da-85dc-22509762e89e",
    "categoryId": "ec10f034-087b-5419-990c-e426b4a3cce4",
    "name": "Sprite 1,75 L",
    "description": null,
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 2,
    "variants": [
      {
        "id": "ad246dd8-7505-52da-85dc-22509762e89e:1",
        "name": "Unidad",
        "price": 9500
      }
    ]
  },
  {
    "id": "c9ab60fc-c1a3-5f12-90f0-eba435fc247e",
    "categoryId": "ec10f034-087b-5419-990c-e426b4a3cce4",
    "name": "Coca-Cola Zero",
    "description": null,
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 3,
    "variants": [
      {
        "id": "c9ab60fc-c1a3-5f12-90f0-eba435fc247e:1",
        "name": "Unidad",
        "price": 9500
      }
    ]
  },
  {
    "id": "e853a1ba-93a7-5d46-b4c7-d0ff0e197b06",
    "categoryId": "ec10f034-087b-5419-990c-e426b4a3cce4",
    "name": "Crush 2,25 L",
    "description": null,
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 4,
    "variants": [
      {
        "id": "e853a1ba-93a7-5d46-b4c7-d0ff0e197b06:1",
        "name": "Unidad",
        "price": 6000
      }
    ]
  },
  {
    "id": "dc10cfa8-0645-57ed-ac90-5a774dc44dd3",
    "categoryId": "ec10f034-087b-5419-990c-e426b4a3cce4",
    "name": "Coca-Cola 500 ml",
    "description": null,
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 5,
    "variants": [
      {
        "id": "dc10cfa8-0645-57ed-ac90-5a774dc44dd3:1",
        "name": "Unidad",
        "price": 3500
      }
    ]
  },
  {
    "id": "999ad57d-3bc3-564d-8a8b-056ef4e356a5",
    "categoryId": "ec10f034-087b-5419-990c-e426b4a3cce4",
    "name": "Sprite 500 ml",
    "description": null,
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 6,
    "variants": [
      {
        "id": "999ad57d-3bc3-564d-8a8b-056ef4e356a5:1",
        "name": "Unidad",
        "price": 3500
      }
    ]
  },
  {
    "id": "e0d9bd2e-8532-583e-a717-6aa17410f54b",
    "categoryId": "ec10f034-087b-5419-990c-e426b4a3cce4",
    "name": "Fanta 500 ml",
    "description": null,
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 7,
    "variants": [
      {
        "id": "e0d9bd2e-8532-583e-a717-6aa17410f54b:1",
        "name": "Unidad",
        "price": 3500
      }
    ]
  },
  {
    "id": "fd22d16d-bb6b-5ea3-916f-b412a2ea176e",
    "categoryId": "ec10f034-087b-5419-990c-e426b4a3cce4",
    "name": "Aquarius 1,5 L",
    "description": null,
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 8,
    "variants": [
      {
        "id": "fd22d16d-bb6b-5ea3-916f-b412a2ea176e:1",
        "name": "Unidad",
        "price": 9500
      }
    ]
  },
  {
    "id": "72cf82cb-7024-59f1-af1b-34e334e2e1ec",
    "categoryId": "ec10f034-087b-5419-990c-e426b4a3cce4",
    "name": "Aquarius 500 ml",
    "description": null,
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 9,
    "variants": [
      {
        "id": "72cf82cb-7024-59f1-af1b-34e334e2e1ec:1",
        "name": "Unidad",
        "price": 3500
      }
    ]
  },
  {
    "id": "b3f9dfe2-1752-559b-a019-bfaedb5aed33",
    "categoryId": "ec10f034-087b-5419-990c-e426b4a3cce4",
    "name": "Agua mineral 1,5 L",
    "description": null,
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 10,
    "variants": [
      {
        "id": "b3f9dfe2-1752-559b-a019-bfaedb5aed33:1",
        "name": "Unidad",
        "price": 8500
      }
    ]
  },
  {
    "id": "90dff7ec-e5be-5148-9a3c-6a89972a6c06",
    "categoryId": "ec10f034-087b-5419-990c-e426b4a3cce4",
    "name": "Agua mineral",
    "description": null,
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 11,
    "variants": [
      {
        "id": "90dff7ec-e5be-5148-9a3c-6a89972a6c06:1",
        "name": "Unidad",
        "price": 3500
      }
    ]
  },
  {
    "id": "11365bab-d463-5a62-afbc-f5f8681f800f",
    "categoryId": "ec10f034-087b-5419-990c-e426b4a3cce4",
    "name": "Agua con gas",
    "description": null,
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 12,
    "variants": [
      {
        "id": "11365bab-d463-5a62-afbc-f5f8681f800f:1",
        "name": "Unidad",
        "price": 3500
      }
    ]
  },
  {
    "id": "5d85acc9-d3ab-5cab-bb12-eb12187610eb",
    "categoryId": "ec10f034-087b-5419-990c-e426b4a3cce4",
    "name": "Cerveza Pampa (lata)",
    "description": null,
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 13,
    "variants": [
      {
        "id": "5d85acc9-d3ab-5cab-bb12-eb12187610eb:1",
        "name": "Unidad",
        "price": 7000
      }
    ]
  },
  {
    "id": "e15e4b9a-877c-52bb-a8d9-a73ef3b880bb",
    "categoryId": "ec10f034-087b-5419-990c-e426b4a3cce4",
    "name": "Cerveza Heineken 1 L",
    "description": null,
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 14,
    "variants": [
      {
        "id": "e15e4b9a-877c-52bb-a8d9-a73ef3b880bb:1",
        "name": "Unidad",
        "price": 12500
      }
    ]
  },
  {
    "id": "df5d5db2-00a7-55b7-bfc7-4be69c5a29ae",
    "categoryId": "ec10f034-087b-5419-990c-e426b4a3cce4",
    "name": "Porrón Estrella Galicia",
    "description": null,
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 15,
    "variants": [
      {
        "id": "df5d5db2-00a7-55b7-bfc7-4be69c5a29ae:1",
        "name": "Unidad",
        "price": 7500
      }
    ]
  },
  {
    "id": "bbf40171-e29f-5eea-a28b-fb43c8506d3f",
    "categoryId": "82afe4ba-fb2c-5e01-84e6-14047d225d44",
    "name": "Gancia",
    "description": "Aperitivo suave con notas dulces y cítricas.",
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 1,
    "variants": [
      {
        "id": "bbf40171-e29f-5eea-a28b-fb43c8506d3f:1",
        "name": "Vaso",
        "price": 7000
      }
    ]
  },
  {
    "id": "0db726f0-1be8-5e42-b8ad-68b22fef2b90",
    "categoryId": "82afe4ba-fb2c-5e01-84e6-14047d225d44",
    "name": "Fernet",
    "description": "Licor amargo de hierbas, intenso y clásico.",
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 2,
    "variants": [
      {
        "id": "0db726f0-1be8-5e42-b8ad-68b22fef2b90:1",
        "name": "Vaso",
        "price": 7000
      }
    ]
  },
  {
    "id": "7ef6a613-46b2-567c-b118-c95bc27dada2",
    "categoryId": "82afe4ba-fb2c-5e01-84e6-14047d225d44",
    "name": "Gin tonic",
    "description": "Gin premium combinado con tónica refrescante.",
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 3,
    "variants": [
      {
        "id": "7ef6a613-46b2-567c-b118-c95bc27dada2:1",
        "name": "Vaso",
        "price": null
      }
    ]
  },
  {
    "id": "081d99cf-6f92-51be-b823-99564857cf72",
    "categoryId": "82afe4ba-fb2c-5e01-84e6-14047d225d44",
    "name": "Vodka con speed",
    "description": "Vodka suave con bebida energizante fría.",
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 4,
    "variants": [
      {
        "id": "081d99cf-6f92-51be-b823-99564857cf72:1",
        "name": "Vaso",
        "price": null
      }
    ]
  },
  {
    "id": "4ecd3d2d-afb8-57c3-889b-43fea0674af1",
    "categoryId": "82afe4ba-fb2c-5e01-84e6-14047d225d44",
    "name": "Campari con naranja",
    "description": "Campari amargo equilibrado con jugo de naranja.",
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 5,
    "variants": [
      {
        "id": "4ecd3d2d-afb8-57c3-889b-43fea0674af1:1",
        "name": "Vaso",
        "price": null
      }
    ]
  },
  {
    "id": "9b2db960-b321-5977-aee9-5a325263c78f",
    "categoryId": "82afe4ba-fb2c-5e01-84e6-14047d225d44",
    "name": "Aperol spritz",
    "description": "Aperol con espumante y soda refrescante.",
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 6,
    "variants": [
      {
        "id": "9b2db960-b321-5977-aee9-5a325263c78f:1",
        "name": "Copa",
        "price": null
      }
    ]
  },
  {
    "id": "1fd26969-cb9a-52df-90e4-9f4d9243d7ce",
    "categoryId": "f32b57aa-bda4-5781-9f6e-747f2f0bf95d",
    "name": "Caipirinha",
    "description": "Cachaça con lima fresca, azúcar y hielo.",
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 1,
    "variants": [
      {
        "id": "1fd26969-cb9a-52df-90e4-9f4d9243d7ce:1",
        "name": "Vaso",
        "price": null
      }
    ]
  },
  {
    "id": "dc53707c-36c2-5809-87f0-353cf8634219",
    "categoryId": "f32b57aa-bda4-5781-9f6e-747f2f0bf95d",
    "name": "Caipiroska",
    "description": "Vodka mezclado con lima fresca y azúcar.",
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 2,
    "variants": [
      {
        "id": "dc53707c-36c2-5809-87f0-353cf8634219:1",
        "name": "Vaso",
        "price": null
      }
    ]
  },
  {
    "id": "48b2619f-b935-51d2-bb6f-bd9f1761e76e",
    "categoryId": "f32b57aa-bda4-5781-9f6e-747f2f0bf95d",
    "name": "Gin tonic de cítricos",
    "description": "Gin con tónica y cítricos naturales.",
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 3,
    "variants": [
      {
        "id": "48b2619f-b935-51d2-bb6f-bd9f1761e76e:1",
        "name": "Vaso",
        "price": null
      }
    ]
  },
  {
    "id": "98395355-464b-5add-988c-ee09181fb7a1",
    "categoryId": "f32b57aa-bda4-5781-9f6e-747f2f0bf95d",
    "name": "Gin tonic del bosque",
    "description": "Gin con frutos rojos y notas herbales.",
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 4,
    "variants": [
      {
        "id": "98395355-464b-5add-988c-ee09181fb7a1:1",
        "name": "Vaso",
        "price": null
      }
    ]
  },
  {
    "id": "f62539b8-d875-5419-8a98-1891af9ebb15",
    "categoryId": "f32b57aa-bda4-5781-9f6e-747f2f0bf95d",
    "name": "Negroni",
    "description": "Gin, vermut rosso y Campari balanceados.",
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 5,
    "variants": [
      {
        "id": "f62539b8-d875-5419-8a98-1891af9ebb15:1",
        "name": "Vaso",
        "price": null
      }
    ]
  },
  {
    "id": "7f3e3793-ec34-56de-8993-30b5a6abf068",
    "categoryId": "f32b57aa-bda4-5781-9f6e-747f2f0bf95d",
    "name": "Daiquiri",
    "description": "Ron blanco con frutilla o durazno y limón.",
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 6,
    "variants": [
      {
        "id": "7f3e3793-ec34-56de-8993-30b5a6abf068:1",
        "name": "Frutilla",
        "price": null
      },
      {
        "id": "7f3e3793-ec34-56de-8993-30b5a6abf068:2",
        "name": "Durazno",
        "price": null
      }
    ]
  },
  {
    "id": "4c896196-6ab2-51bc-999c-ccc89ef86254",
    "categoryId": "f32b57aa-bda4-5781-9f6e-747f2f0bf95d",
    "name": "Gancia batido",
    "description": "Gancia batido con cítricos y hielo.",
    "madeToOrderNotice": null,
    "inStock": true,
    "order": 7,
    "variants": [
      {
        "id": "4c896196-6ab2-51bc-999c-ccc89ef86254:1",
        "name": "Vaso",
        "price": null
      }
    ]
  }
]
