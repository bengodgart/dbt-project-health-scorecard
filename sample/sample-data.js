// sample-data.js, the sample fixture embedded as a JS object.
// Mirrors sample-evaluator-results.json exactly (test.js asserts the two never drift) so the
// in-browser "Load the sample" button works even when index.html is opened directly as a
// file:// page, where fetch() of a local JSON file is blocked by some browsers.
var SAMPLE_EVALUATOR_RESULTS = {
  "project_name": "jaffle_shop_analytics (representative fixture)",
  "generated_at": "2026-06-01",
  "is_representative_fixture": true,
  "fixture_note": "This file is a representative composite built from the documented dbt-project-evaluator output schema. It is not the output of a real evaluator run. See README 'About the sample data'.",
  "models": [
    {
      "unique_id": "model.jaffle_shop.stg_customers",
      "name": "stg_customers",
      "layer": "staging"
    },
    {
      "unique_id": "model.jaffle_shop.stg_orders",
      "name": "stg_orders",
      "layer": "staging"
    },
    {
      "unique_id": "model.jaffle_shop.stg_payments",
      "name": "stg_payments",
      "layer": "staging"
    },
    {
      "unique_id": "model.jaffle_shop.stg_products",
      "name": "stg_products",
      "layer": "staging"
    },
    {
      "unique_id": "model.jaffle_shop.stg_locations",
      "name": "stg_locations",
      "layer": "staging"
    },
    {
      "unique_id": "model.jaffle_shop.stg_supplies",
      "name": "stg_supplies",
      "layer": "staging"
    },
    {
      "unique_id": "model.jaffle_shop.int_orders_joined",
      "name": "int_orders_joined",
      "layer": "intermediate"
    },
    {
      "unique_id": "model.jaffle_shop.int_payments_pivoted",
      "name": "int_payments_pivoted",
      "layer": "intermediate"
    },
    {
      "unique_id": "model.jaffle_shop.int_customer_orders_rollup",
      "name": "int_customer_orders_rollup",
      "layer": "intermediate"
    },
    {
      "unique_id": "model.jaffle_shop.dim_customers",
      "name": "dim_customers",
      "layer": "marts"
    },
    {
      "unique_id": "model.jaffle_shop.dim_products",
      "name": "dim_products",
      "layer": "marts"
    },
    {
      "unique_id": "model.jaffle_shop.dim_locations",
      "name": "dim_locations",
      "layer": "marts"
    },
    {
      "unique_id": "model.jaffle_shop.fct_orders",
      "name": "fct_orders",
      "layer": "marts"
    },
    {
      "unique_id": "model.jaffle_shop.fct_order_items",
      "name": "fct_order_items",
      "layer": "marts"
    },
    {
      "unique_id": "model.jaffle_shop.fct_payments",
      "name": "fct_payments",
      "layer": "marts"
    },
    {
      "unique_id": "model.jaffle_shop.mart_customer_metrics",
      "name": "mart_customer_metrics",
      "layer": "marts"
    },
    {
      "unique_id": "model.jaffle_shop.mart_finance_summary",
      "name": "mart_finance_summary",
      "layer": "marts"
    },
    {
      "unique_id": "model.jaffle_shop.mart_product_performance",
      "name": "mart_product_performance",
      "layer": "marts"
    },
    {
      "unique_id": "model.jaffle_shop.mart_supply_costs",
      "name": "mart_supply_costs",
      "layer": "marts"
    },
    {
      "unique_id": "model.jaffle_shop.mart_sales_by_location",
      "name": "mart_sales_by_location",
      "layer": "marts"
    }
  ],
  "sources": [
    {
      "unique_id": "source.jaffle_shop.raw_jaffle_shop.customers",
      "name": "raw_jaffle_shop.customers"
    },
    {
      "unique_id": "source.jaffle_shop.raw_jaffle_shop.orders",
      "name": "raw_jaffle_shop.orders"
    },
    {
      "unique_id": "source.jaffle_shop.raw_jaffle_shop.payments",
      "name": "raw_jaffle_shop.payments"
    },
    {
      "unique_id": "source.jaffle_shop.raw_jaffle_shop.products",
      "name": "raw_jaffle_shop.products"
    },
    {
      "unique_id": "source.jaffle_shop.raw_jaffle_shop.locations",
      "name": "raw_jaffle_shop.locations"
    },
    {
      "unique_id": "source.jaffle_shop.raw_jaffle_shop.supplies",
      "name": "raw_jaffle_shop.supplies"
    }
  ],
  "fct_test_coverage": {
    "total_models": 20,
    "tested_models": 14,
    "test_coverage_pct": 70
  },
  "fct_missing_primary_key_tests": [
    {
      "unique_id": "model.jaffle_shop.fct_order_items",
      "model_name": "fct_order_items",
      "layer": "marts"
    },
    {
      "unique_id": "model.jaffle_shop.int_payments_pivoted",
      "model_name": "int_payments_pivoted",
      "layer": "intermediate"
    },
    {
      "unique_id": "model.jaffle_shop.stg_supplies",
      "model_name": "stg_supplies",
      "layer": "staging"
    }
  ],
  "fct_undocumented_models": [
    {
      "unique_id": "model.jaffle_shop.mart_supply_costs",
      "model_name": "mart_supply_costs",
      "layer": "marts"
    },
    {
      "unique_id": "model.jaffle_shop.mart_sales_by_location",
      "model_name": "mart_sales_by_location",
      "layer": "marts"
    },
    {
      "unique_id": "model.jaffle_shop.int_customer_orders_rollup",
      "model_name": "int_customer_orders_rollup",
      "layer": "intermediate"
    },
    {
      "unique_id": "model.jaffle_shop.stg_locations",
      "model_name": "stg_locations",
      "layer": "staging"
    }
  ],
  "fct_undocumented_sources": [
    {
      "unique_id": "source.jaffle_shop.raw_jaffle_shop.supplies",
      "source_name": "raw_jaffle_shop.supplies"
    }
  ],
  "fct_direct_join_to_source": [
    {
      "unique_id": "model.jaffle_shop.dim_products",
      "model_name": "dim_products",
      "layer": "marts",
      "source_name": "raw_jaffle_shop.products"
    },
    {
      "unique_id": "model.jaffle_shop.mart_finance_summary",
      "model_name": "mart_finance_summary",
      "layer": "marts",
      "source_name": "raw_jaffle_shop.payments"
    }
  ],
  "fct_model_fanout": [
    {
      "unique_id": "model.jaffle_shop.stg_orders",
      "model_name": "stg_orders",
      "layer": "staging",
      "num_children": 9
    },
    {
      "unique_id": "model.jaffle_shop.stg_customers",
      "model_name": "stg_customers",
      "layer": "staging",
      "num_children": 7
    }
  ],
  "fct_source_fanout": [
    {
      "unique_id": "source.jaffle_shop.raw_jaffle_shop.orders",
      "source_name": "raw_jaffle_shop.orders",
      "num_direct_children": 6
    }
  ],
  "fct_staging_dependent_on_marts_or_intermediate": [
    {
      "unique_id": "model.jaffle_shop.stg_supplies",
      "model_name": "stg_supplies",
      "layer": "staging",
      "depends_on_model": "dim_products"
    }
  ],
  "fct_rejoining_of_upstream_concepts": [
    {
      "unique_id": "model.jaffle_shop.mart_finance_summary",
      "model_name": "mart_finance_summary",
      "layer": "marts",
      "rejoined_models": "fct_orders and fct_payments"
    }
  ],
  "fct_root_models": [
    {
      "unique_id": "model.jaffle_shop.int_customer_orders_rollup",
      "model_name": "int_customer_orders_rollup",
      "layer": "intermediate"
    }
  ],
  "fct_model_naming_conventions": [
    {
      "unique_id": "model.jaffle_shop.mart_supply_costs",
      "model_name": "mart_supply_costs",
      "layer": "marts",
      "expected_prefix": "fct_ or dim_",
      "actual_prefix": "mart_"
    },
    {
      "unique_id": "model.jaffle_shop.mart_finance_summary",
      "model_name": "mart_finance_summary",
      "layer": "marts",
      "expected_prefix": "fct_ or dim_",
      "actual_prefix": "mart_"
    },
    {
      "unique_id": "model.jaffle_shop.mart_customer_metrics",
      "model_name": "mart_customer_metrics",
      "layer": "marts",
      "expected_prefix": "fct_ or dim_",
      "actual_prefix": "mart_"
    },
    {
      "unique_id": "model.jaffle_shop.mart_sales_by_location",
      "model_name": "mart_sales_by_location",
      "layer": "marts",
      "expected_prefix": "fct_ or dim_",
      "actual_prefix": "mart_"
    }
  ],
  "fct_model_directories": [
    {
      "unique_id": "model.jaffle_shop.stg_supplies",
      "model_name": "stg_supplies",
      "layer": "staging",
      "expected_directory": "models/staging/",
      "actual_directory": "models/marts/"
    },
    {
      "unique_id": "model.jaffle_shop.int_customer_orders_rollup",
      "model_name": "int_customer_orders_rollup",
      "layer": "intermediate",
      "expected_directory": "models/intermediate/",
      "actual_directory": "models/staging/"
    }
  ]
};

if (typeof module !== 'undefined' && module.exports) module.exports = SAMPLE_EVALUATOR_RESULTS;
