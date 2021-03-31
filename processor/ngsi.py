from config.settings import AT_CONTEXT, URL_BROKER, PROPERTIES, SCOPE
from config.logging_conf import LoggingConf
from pytz import timezone
from datetime import datetime
from pandas import read_csv
from requests import post
from logging import error, info
from time import sleep

__author__ = 'Fernando López'


class NGSI(LoggingConf):
    def __init__(self, loglevel):
        super(NGSI, self).__init__(loglevel=loglevel, log_file='f4w-challenge-milan.log')

        self.entityId = ""
        self.propertyName = ""

        self.headersPost = {
            'Content-Type': 'application/ld+json'
        }

        self.url_entities = URL_BROKER + '/ngsi-ld/v1/entities'
        self.url_entities_op = URL_BROKER + '/ngsi-ld/v1/entityOperations/update'

        self.timezone_UTC = timezone('UTC')

    def set_file(self, filename):
        """
        Extract the Sensor ID and the property from the filename
        :param filename: The filename
        :return: The Entity Id and the property
        """
        filename = filename.split("_")
        self.entityId = filename[0]
        self.propertyName = filename[1]

    def process(self, file):
        info(f"Starting process of file: {file[0]}")

        # Set the filename to extract EntityId and Property name
        self.set_file(file[0])

        # Read content of the file
        df = read_csv(filepath_or_buffer=file[1], sep=';')

        # Extract only the columns Data/Ore and Valore
        df = df[["Data/Ora", "Valore"]]

        # Sort the data by Data/Ora
        df = df.sort_values(by=['Data/Ora'])

        # First record of a measure will be uploaded as a CREATE,
        # then other records will be uploaded as a PATCH
        row_1 = df[:1]
        self.create(row_1['Data/Ora'].values[0], row_1['Valore'].values[0])

        # Get the last values of the excel file: PATCH
        last = df.tail(len(df.index) - 1)

        # Iterating over two columns, use `zip`
        try:
            [self.update(date_observed=x, measure=y) for x, y in zip(last['Data/Ora'], last['Valore'])]
        except ValueError as e:
            error("There was a problem parsing the csv data")

    def __get_values__(self, date_observed, measure):
        measure = float(measure.strip().replace(",", "."))
        date_observed = datetime.strptime(date_observed, '%d/%m/%Y %H:%M:%S')
        date_observed = self.timezone_UTC.localize(date_observed).isoformat()

        return date_observed, measure

    def create(self, date_observed, measure):
        date_observed, measure = self.__get_values__(date_observed=date_observed, measure=measure)

        _, data = self.__data__(date_observed=date_observed, measure=measure)

        info(f"Create: Data to be uploaded:\n {data}\n")

        # CREATE
        info('Creating ...')
        r = post(self.url_entities, json=data, headers=self.headersPost)
        info(f'Create Status: [{r.status_code}]')

        # Wait some time to proceed with the following
        sleep(SCOPE)

    def update(self, date_observed, measure):
        # it is not working...
        date_observed, measure = self.__get_values__(date_observed=date_observed, measure=measure)

        entity_id, data = self.__data__(date_observed=date_observed, measure=measure)

        info(f"Patch: Data to be uploaded:\n {data}\n")

        # PATCH
        info('Patching ...')
        r = post(self.url_entities_op, json=[data], headers=self.headersPost)
        info(f'Patch Status: [{r.status_code}]')

        # Wait some seconds to proceed with the following request
        sleep(SCOPE)

    def __data__(self, date_observed, measure):
        date_observed = {
            "type": "Property",
            "value": {
                "@type": "DateTime",
                "@value": date_observed
            }
        }

        property_data = PROPERTIES[self.propertyName]
        entity_property = {
            "type": "Property",
            "value": measure,
            "unitCode": property_data['unitCode']
        }

        entity_id = "urn:ngsi-ld:WaterQualityObserved:waterqualityobserved:WWTP:{}".format(self.entityId)

        entity_type = "WaterQualityObserved"

        data = {
            "id": entity_id,
            "type": entity_type,
            "dateObserved": date_observed,
            property_data['propertyName']: entity_property,
            "@context": AT_CONTEXT
        }

        return entity_id, data
