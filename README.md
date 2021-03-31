# Fiware4Water Milan Challenge - Script to load data
IoT Agent to translate .xls and .csv into NGSI-LD to be used in the Fiware4Water Challenge - Milan

## Requisites
- docker version 20.10.5, build 55c4c88
- docker-compose version 1.28.5, build c4eb3a1f
- python3.9
- virtualenv >= 20.4.3

## Installation

- Clone this repository
- Create virtualenv
  ```bash
  virtualenv -ppython3.9 .env
  ```
- Activate the python virtual environment:
  ```bash
  source .env/bin/activate
  ```
- Install requirements:
  ```bash
  pip install -r requirements.txt
  ```

time=Tuesday 30 Mar 20:14:55 2021.126Z | lvl=ERROR | corr=N/A | trans=N/A | from=N/A | srv=N/A | subsrv=N/A | comp=Orion | op=kjTreeToContextAttribute.cpp[625]:kjTreeToContextAttribute | msg=Invalid type for attribute 'type': 'Address'

time=Tuesday 30 Mar 20:14:55 2021.127Z | lvl=ERROR | corr=N/A | trans=N/A | from=N/A | srv=N/A | subsrv=N/A | comp=Orion | op=orionldPostEntities.cpp[377]:orionldPostEntities | msg=kjTreeToContextAttribute failed: Invalid type for attribute

