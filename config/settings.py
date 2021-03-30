from json import load
from os import listdir
from os.path import join, dirname, abspath

__author__ = 'fla'

__version__ = '0.5.0'

# Settings file is inside Basics directory, therefore I have to go back to the parent directory
# to have the Code Home directory
CODEHOME = dirname(dirname(abspath(__file__)))
LOGHOME = join(CODEHOME, 'logs')
CONFIGFILE = join(join(CODEHOME, "config"), 'configuration.json')

# Reading some configuration
with open(CONFIGFILE, 'r') as f:
    configuration = load(f)

# NGSI-LD Context
AT_CONTEXT = configuration['AT_CONTEXT']
configuration.pop('AT_CONTEXT')

# CSV_FOLDER should start without any '/', the folder in which the csv files are included, relative to the code
CSV_FOLDER = configuration['FILES']
configuration.pop('FILES')

# URL for entities
URL_ENTITIES = configuration['URL_ENTITIES']
configuration.pop('URL_ENTITIES')

PROPERTIES = configuration.copy()

# Absolute path to the csv files, it is fixed to the relative path of this script
DATAHOME = join(CODEHOME, CSV_FOLDER)

# List of all csv files to process
CSV_FILES = list(map(lambda x: (x, join(DATAHOME, x)), listdir(DATAHOME)))
