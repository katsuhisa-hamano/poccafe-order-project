{
  "object": {
    "type": "ITEM",
    "id": "L3SYKBW3445GLFVTNMDTGKMK",
    "updated_at": "2026-05-29T11:10:02.028Z",
    "created_at": "2026-05-29T00:46:13.173Z",
    "version": 1780053002028,
    "is_deleted": false,
    "present_at_all_locations": true,
    "item_data": {
      "name": "かき氷",
      "is_taxable": true,
      "modifier_list_info": [
        {
          "modifier_list_id": "EKVSACR72QSXV4KWFN57GHEU",
          "modifier_overrides": [
            {
              "modifier_id": "MFO56VEYNKPT26PYWSGD2UUA",
              "on_by_default": false,
              "hidden_online_override": "NO",
              "on_by_default_override": "NO"
            },
            {
              "modifier_id": "5SCZ45T24ZJDR7BB6Z276GMB",
              "on_by_default": false,
              "hidden_online_override": "NO",
              "on_by_default_override": "NO"
            }
          ],
          "min_selected_modifiers": 0,
          "max_selected_modifiers": 0, // 0 means no limit
          "enabled": true,
          "hidden_from_customer": false,
          "ordinal": 1,
          "allow_quantities": "NO",
          "is_conversational": "NO",
          "hidden_from_customer_override": "NO"
        }
      ],
      "variations": [
        {
          "type": "ITEM_VARIATION",
          "id": "GSOWU7VXUY5YJSYX6ISJG42F",
          "updated_at": "2026-05-29T00:48:54.16Z",
          "created_at": "2026-05-29T00:46:13.173Z",
          "version": 1780015734160,
          "is_deleted": false,
          "present_at_all_locations": true,
          "item_variation_data": {
            "item_id": "L3SYKBW3445GLFVTNMDTGKMK",
            "name": "通常",
            "ordinal": 0,
            "pricing_type": "FIXED_PRICING",
            "price_money": {
              "amount": 300,
              "currency": "JPY"
            },
            "track_inventory": false,
            "sellable": true,
            "stockable": true,
            "channels": [
              "CH_bTAxsR7xfqJ3sbe8oqOJ8yhFymI34Vw2RJS1zUR29945o",
              "CH_mHJPqX5Bnlt5pH0evqAG8yhFymI34Vw2RJS1zUR29945o"
            ]
          }
        }
      ],
      "product_type": "FOOD_AND_BEV",
      "skip_modifier_screen": false,
      "ecom_visibility": "VISIBLE",
      "image_ids": [
        "7Q5GUNX35V7ZJRLGRXFIE5CE"
      ],
      "categories": [
        {
          "id": "3DYBWI32RRNX6IQTYY43DPAL",
          "ordinal": -2251799796908032
        },
        {
          "id": "Z7EKRR5H34ZPNXPVRDCWSLOJ",
          "ordinal": -2251799796908032
        }
      ],
      "channels": [
        "CH_bTAxsR7xfqJ3sbe8oqOJ8yhFymI34Vw2RJS1zUR29945o",
        "CH_mHJPqX5Bnlt5pH0evqAG8yhFymI34Vw2RJS1zUR29945o"
      ],
      "is_archived": false,
      "reporting_category": {
        "id": "3DYBWI32RRNX6IQTYY43DPAL",
        "ordinal": -2251799796908032
      },
      "is_alcoholic": false
    }
  },
  "related_objects": [
    {
      "type": "CATEGORY",
      "id": "3DYBWI32RRNX6IQTYY43DPAL",
      "updated_at": "2026-05-29T00:40:21.458Z",
      "created_at": "2026-05-29T00:40:21.506Z",
      "version": 1780015221458,
      "is_deleted": false,
      "present_at_all_locations": true,
      "category_data": {
        "name": "午後カフェ",
        "category_type": "REGULAR_CATEGORY",
        "parent_category": {
          "ordinal": -2251799662690304
        },
        "is_top_level": true,
        "channels": [
          "CH_bTAxsR7xfqJ3sbe8oqOJ8yhFymI34Vw2RJS1zUR29945o"
        ],
        "online_visibility": false
      }
    },
    {
      "type": "MODIFIER_LIST",
      "id": "EKVSACR72QSXV4KWFN57GHEU",
      "updated_at": "2026-05-29T00:44:22.488Z",
      "created_at": "2026-05-29T00:44:22.524Z",
      "version": 1780015462488,
      "is_deleted": false,
      "present_at_all_locations": true,
      "modifier_list_data": {
        "name": "トッピング",
        "ordinal": 3,
        "selection_type": "SINGLE",
        "modifiers": [
          {
            "type": "MODIFIER",
            "id": "MFO56VEYNKPT26PYWSGD2UUA",
            "updated_at": "2026-05-29T00:44:22.488Z",
            "created_at": "2026-05-29T00:44:22.524Z",
            "version": 1780015462488,
            "is_deleted": false,
            "present_at_all_locations": true,
            "modifier_data": {
              "name": "練乳かけ放題",
              "price_money": {
                "amount": 50,
                "currency": "JPY"
              },
              "on_by_default": false,
              "ordinal": 1,
              "modifier_list_id": "EKVSACR72QSXV4KWFN57GHEU",
              "hidden_online": false
            }
          },
          {
            "type": "MODIFIER",
            "id": "5SCZ45T24ZJDR7BB6Z276GMB",
            "updated_at": "2026-05-29T00:44:22.488Z",
            "created_at": "2026-05-29T00:44:22.524Z",
            "version": 1780015462488,
            "is_deleted": false,
            "present_at_all_locations": true,
            "modifier_data": {
              "name": "バニラアイス",
              "price_money": {
                "amount": 100,
                "currency": "JPY"
              },
              "on_by_default": false,
              "ordinal": 2,
              "modifier_list_id": "EKVSACR72QSXV4KWFN57GHEU",
              "hidden_online": false
            }
          }
        ],
        "allow_quantities": false,
        "modifier_type": "LIST",
        "max_length": 150,
        "text_required": false,
        "internal_name": "かき氷トッピング",
        "min_selected_modifiers": 0,
        "max_selected_modifiers": 1
      }
    },
    {
      "type": "IMAGE",
      "id": "7Q5GUNX35V7ZJRLGRXFIE5CE",
      "updated_at": "2026-05-29T11:09:37.789Z",
      "created_at": "2026-05-29T11:09:37.821Z",
      "version": 1780052977789,
      "is_deleted": false,
      "present_at_all_locations": true,
      "image_data": {
        "name": "kakikoori.png",
        "url": "https://items-images-production.s3.us-west-2.amazonaws.com/files/f9fffb3d423506636ccd4f26b819ae34f4a19fda/original.png"
      }
    }
  ]
}