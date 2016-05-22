# oslc-schema-viewer
Extracts schema information from an OSLC provider and draws a Domain Specification View

## Overview
Starting with an OSLC catalog URL, this web application
- loads the catalog resource and uses it to find all resource types, domains and resource shapes
- draws a diagram of all domains, resource types and properties.

![Domain Specification View example](docs/domainSpecificationView.png)


## OSLC Meta model

Parts relevant for this application.

![meta model](http://yuml.me/4acb73c3)

## Metadata Retrieval Algorithm

- get the catalog
    - iterate over each service provider in it
        - for each service
            - for each QueryCapability and CreationFactory
                - get the resourceShape - save it
                    - for each property in it
                        - find out resource type by type of any found resource
                        - find out reference property target type by
                          1. oslc:range
                          1. type of target resource in instance
