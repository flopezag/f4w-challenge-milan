from config.settings import AT_CONTEXT, URL_ENTITIES, PROPERTIES
from config.logging_conf import LoggingConf
from pytz import timezone
from datetime import datetime
from pandas import read_csv
from requests import post


class NGSI(LoggingConf):
    def __init__(self):
        super(NGSI, self).__init__(loglevel=loglevel, log_file='askbot.log')

        self.entityId = ""
        self.propertyName = ""

        self.headersPost = {
            'Content-Type': 'application/ld+json'
        }

        self.url = URL_ENTITIES

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
        # Set the filename to extract EntityId and Property name
        self.set_file(file[0])

        # Read content of the file
        df = read_csv(filepath_or_buffer=file[1], sep=';')

        # Extract only the columns Data/Ore and Valore
        df = df[["Data/Ora", "Valore"]]

        # Sort the data by Data/Ora
        df = df.sort_values(by=['Data/Ora'])

        # First record of a DMA will be uploaded as a CREATE,
        # then other records will be uploaded as a PATCH
        row_1 = df[:1]
        print(row_1)
        self.create(row_1['Data/Ora'].values[0], row_1['Valore'].values[0])

        # Get the last values of the excel file: PATCH
        last = df.tail(len(df.index) - 1)

        # Iterating over two columns, use `zip`
        try:
            result = [self.patch(date_observed=x, measure=y) for x, y in zip(df['Data/Ora'], df['Valore'])]
        except ValueError as e:
            print(e)

    def __get_values__(self, date_observed, measure):
        measure = float(measure.strip().replace(",", "."))
        date_observed = datetime.strptime(date_observed, '%d/%m/%Y %H:%M:%S')
        date_observed = self.timezone_UTC.localize(date_observed).isoformat()

        return date_observed, measure

    def create(self, date_observed, measure):
        date_observed, measure = self.__get_values__(date_observed=date_observed, measure=measure)

        #         plantId = 'urn:ngsi-ld:WaterConsumption:' + dateObserved
        #         period = 900
        #         observedAt = row['DTT']
        #         observedAt = datetime.strptime(observedAt, '%d/%m/%Y %H:%M')
        #         observedAt = timezone_UTC.localize(observedAt).isoformat()
        #         measure = row['Litres']
        #         if created:
        #             # CREATE
        #             print('creating ...')
        #             # entity = ngsi_entity(dma, plantId, observedAt, measure, period)
        #             # r = post(URL_ENTITIES, json=entity, headers=headers_post)
        #             # print(f'Status: [{r.status_code}]')
        #             created = True

    def patch(self, date_observed, measure):
        date_observed, measure = self.__get_values__(date_observed=date_observed, measure=measure)

        data = self.__data__(date_observed=date_observed, measure=measure)

        print(data)

        #         plantId = 'urn:ngsi-ld:WaterConsumption:' + dateObserved
        #         period = 900
        #         observedAt = row['DTT']
        #         observedAt = datetime.strptime(observedAt, '%d/%m/%Y %H:%M')
        #         observedAt = timezone_UTC.localize(observedAt).isoformat()
        #         measure = row['Litres']
        #         if created:
        #             # PATCH
        #             print('patching ...')
        #             # entity = ngsi_patch(observedAt, measure, period)
        #             URL_PATCH = URL_ENTITIES+plantId+'/attrs'
        #             #r = post(URL_PATCH, json=entity, headers=headers_post)
        #             # print(f'Status: [{r.status_code}]')

    def __data__(self, date_observed, measure):
        date_observed = {
            "type": "Property",
            "value": {
                "@type": "DateTime",
                "@value": date_observed
            }
        }

        location = {
            "type": "Address",
            "value": {
                "type": "areaServed",
                "value": self.entityId
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
            "location": location,
            property_data['propertyName']: entity_property,
            "@context": AT_CONTEXT
        }

        return data


    # def ngsi_create(id, date, attribute, measure):
    #     ngsi_json = {
    #         '@context': AT_CONTEXT,
    #         'id': plantId,
    #         'type': 'WaterConsumption',
    #         'dma': {
    #             'type': 'Property',
    #             'value': dma
    #         },
    #         'litres': {
    #             'type': 'Property',
    #             'value': measure,
    #             'observedAt': observedAt,
    #             'unitCode': 'LTR',
    #             'period': {
    #                 'type': 'Property',
    #                 'value': period,
    #                 'unitCode': 'SEC'
    #             }
    #         }
    #     }
    #
    #     return (ngsi_json)
    #
    # def ngsi_patch(observedAt, measure, period):
    #     ngsi_json = {
    #         '@context': AT_CONTEXT,
    #         "litres": {
    #             'type': 'Property',
    #             'value': measure,
    #             'observedAt': observedAt,
    #             'unitCode': 'LTR',
    #             'period': {
    #                 'type': 'Property',
    #                 'value': period,
    #                 'unitCode': 'SEC'
    #             }
    #         }
    #     }
    #     return (ngsi_json)
