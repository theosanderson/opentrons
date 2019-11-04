import logging

from .util import log_call
from opentrons import types
from opentrons.config import CONFIG
from opentrons.legacy_api.containers.placeable import Container, Well
# from opentrons.protocol_api.labware_helpers import load
from opentrons.protocol_api import labware as lw
# from opentrons.protocol_api.contexts import ProtocolContext
from typing import Any, Dict, List, Optional, Tuple, Union, TYPE_CHECKING

if TYPE_CHECKING:
    from ..contexts import ProtocolContext

log = logging.getLogger(__name__)


class Containers():
    def __init__(self,
                 protocol_ctx: 'ProtocolContext'):
        self._ctx = protocol_ctx

    @log_call(log)
    def load(self,
             container_name: str,
             slot: types.DeckLocation,
             label: str = None,
             share: bool = False):
        """
        Examples
        --------
        >>> from opentrons import containers
        >>> containers.load('96-flat', '1')
        <Deck>/<Slot 1>/<Container 96-flat>
        >>> containers.load('96-flat', '4', 'plate')
        <Deck>/<Slot 4>/<Container plate>
        >>> containers.load('non-existent-type', '4') # doctest: +ELLIPSIS
        Exception: Container type "non-existent-type" not found in file ...
        """
        container_name = container_name.lower().replace('-', '_')

        if self._ctx._deck_layout[slot] and not share:
            raise RuntimeWarning(
                f'Slot {slot} has child. Use "containers.load(\''
                f'{container_name}\', \'{slot}\', share=True)"')

        try:
            return self._ctx.load_labware(
                container_name, slot, label, legacy=True)
        except FileNotFoundError:
            container_name = container_name.replace('-', '_')
            return self._ctx.load_labware(
                container_name,
                slot,
                label,
                namespace='legacy_api',
                legacy=True)

    @log_call(log)
    def list(self):
        return lw.get_all_labware_definitions()

    @log_call(log)
    def create(
               name: str,
               grid: Tuple[int, int],
               spacing: Tuple[Union[int, float], Union[int, float]],
               diameter: Union[int, float],
               depth: Union[int, float],
               volume: Optional[Union[int, float]] = 0):
        """
        Creates a labware definition based on a rectangular gird, depth,
        diameter, and spacing. Note that this function can only create labware
        with regularly spaced wells in a rectangular format, of equal height,
        depth, and radius. Irregular labware defintions will have to be made in
        other ways or modified using a regular definition as a starting point.
        Also, upon creation a definition always has its lower-left well at
        (0, 0, 0), such that this labware _must_ be calibrated before use.

        :param name: the name of the labware to be used with `labware.load`
        :param grid: a 2-tuple of integers representing (<n_columns>, <n_rows>)
        :param spacing: a 2-tuple of floats representing
            (<col_spacing, <row_spacing)
        :param diameter: a float representing the internal diameter of each
            well
        :param depth: a float representing the distance from the top of each
            well to the internal bottom of the same well
        :param volume: [optional] the maximum volume of each well
        :return: the labware object created by this function
        """
        columns, rows = grid
        col_spacing, row_spacing = spacing

        lw_dict, labware_name, is_tiprack = \
            _format_labware_definition(name, labware=None)

        if is_tiprack:
            lw_dict['parameters']['tipLength'] = depth
            lw_dict['parameters']['tipOverlap'] = 0

        lw_dict['groups'] = [{'wells': [], 'metadata': {}}]
        lw_dict['ordering'] = []

        for c in range(columns):
            lw_dict['ordering'].append([])
            for r in range(rows):
                well_name = chr(r + ord('A')) + str(1 + c)
                coordinates = (c * col_spacing,
                               (rows - r - 1) * row_spacing,
                               depth)
                lw_dict['groups'][0]['wells'].append(well_name)
                lw_dict['ordering'][-1].append(well_name)
                lw_dict['wells'][well_name] = {
                     "depth": depth,
                     "shape": "circular",
                     "diameter": diameter,
                     "totalLiquidVolume": volume,
                     "x": coordinates[0],
                     "y": coordinates[1],
                     "z": coordinates[2]
                     }

        lw_dict['cornerOffsetFromSlot'] = {'x': 0, 'y': 0, 'z': 0}

        lw_dict['dimensions'] = {
            'xDimension': 127.76,
            'yDimension': 85.48,
            'zDimension': depth}

        path_to_save_defs = CONFIG['labware_user_definitions_dir_v2']
        lw.save_definition(lw_dict, location=path_to_save_defs)

        # return load(name,
        #             label: str = None,
        #             namespace: str = None,
        #             version: int = 1,
        #             bundled_defs: Dict[str, LabwareDefinition] = None,
        #             extra_defs: Dict[str, LabwareDefinition] = None)




def _format_labware_definition(labware_name: str, labware: Container = None):
    lw_dict: Dict[str, Any] = {}
    lw_dict['wells'] = {}
    converted_labware_name = labware_name.replace("-", "_").lower()
    is_tiprack = True if 'tip' in converted_labware_name else False

    # Definition Metadata
    lw_dict['brand'] = {'brand': 'opentrons'}
    lw_dict['schemaVersion'] = 2
    lw_dict['version'] = 1
    lw_dict['namespace'] = 'legacy_api'
    lw_dict['metadata'] = {
        'displayName': converted_labware_name,
        'displayCategory': 'tipRack' if is_tiprack else 'other',
        'displayVolumeUnits': 'µL'}
    lw_dict['parameters'] = {
        'format': 'irregular',
        'isMagneticModuleCompatible': False,
        'loadName': converted_labware_name,
        'isTiprack': is_tiprack}

    if labware:
        pass

    return lw_dict, converted_labware_name, is_tiprack


def _add_well(
        lw_dict: Dict[str, Any],
        well_name: str,
        well_props: Dict[str, Any],
        well_coordinates):
    lw_dict['wells'][well_name] = {
        'x': well_coordinates['x'],
        'y': well_coordinates['y'],
        'z': well_coordinates['z'],
        'totalLiquidVolume': well_props.get('total-liquid-volume', 0),
        'depth': well_props.get('depth', 0)}
    if well_props.get('diameter'):
        lw_dict['wells'][well_name]['diameter'] = well_props.get('diameter')
        lw_dict['wells'][well_name]['shape'] = 'circular'
    else:
        lw_dict['wells'][well_name]['xDimension'] = well_props.get('length')
        lw_dict['wells'][well_name]['yDimension'] = well_props.get('width')
        lw_dict['wells'][well_name]['shape'] = 'rectangular'


class LegacyLabware(lw.Labware):
    def __init__(self, definition: dict,
                 parent: types.Location, label: str = None) -> None:
        super().__init__(definition, parent)
        self._wells_by_index = super().wells()
        self._wells_by_name = super().wells_by_name()
        self._columns = super().columns()
        self._rows = super().rows()
        self._properties = {
            'length': self.dimensions['xDimension'],
            'width': self.dimensions['yDimension'],
            'height': self.dimensions['zDimension'],
            'type': self.display_name,
            'magdeck_engage_height': self.magdeck_engage_height
            }

    def get_index_by_name(self, name):
        """
        Retrieves child's name by index
        """
        return self._wells_by_index.index(self._wells_by_name[name])

    def get_wells_by_xy(self, **kwargs) -> Union[lw.Well, List[lw.Well]]:
        x = kwargs.get('x', None)
        y = kwargs.get('y', None)
        if x is None and isinstance(y, int):
            return self._rows[y]
        elif y is None and isinstance(x, int):
            return self._columns[x]
        elif isinstance(x, int) and isinstance(y, int):
            return self._columns[x][y]
        else:
            raise ValueError('Labware.wells(x=, y=) expects ints')

    def get_wells_by_to_and_length(self, *args, **kwargs):
        start = args[0] if len(args) else 0
        stop = kwargs.get('to', None)
        step = kwargs.get('step', 1)
        length = kwargs.get('length', 1)

        wrapped_wells = [w
                         for i in range(3)
                         for w in self._wells_by_index]
        total_wells = len(self._wells_by_index)

        if isinstance(start, str):
            start = self.get_index_by_name(start)
        if stop:
            if isinstance(stop, str):
                stop = self.get_index_by_name(stop)
            if stop > start:
                stop += 1
                step = step * -1 if step < 0 else step
            elif stop < start:
                stop -= 1
                step = step * -1 if step > 0 else step
            new_wells = wrapped_wells[
                start + total_wells:stop + total_wells:step]
        else:
            if length < 0:
                length *= -1
                step = step * -1 if step > 0 else step
            new_wells = wrapped_wells[start + total_wells::step][:length]

        if len(new_wells) == 1:
            return new_wells[0]
        else:
            return new_wells

    @property
    def properties(self) -> Dict:
        return self._properties

    def get_well_by_type(
            self,
            well: Union[int, str, slice]) -> Union[List[lw.Well], lw.Well]:
        if isinstance(well, int):
            return self._wells_by_index[well]
        elif isinstance(well, str):
            return self._wells_by_name[well]
        else:
            raise TypeError(f"Type {type(well)} is not compatible.")

    def _flatten_well_list(self, lis):
        new_list = []
        for item in lis:
            if isinstance(item, list):
                new_list.extend(self._flatten_well_list(item))
            else:
                new_list.append(self.get_well_by_type(item))
        return new_list

    def wells(self,  # type: ignore
              *args,
              **kwargs) -> Union[List[lw.Well], lw.Well]:
        """
        Returns child Well or list of child Wells
        """
        if not args and not kwargs:
            return self._wells_by_index
        elif len(args) and isinstance(args[0], list):
            return self._flatten_well_list(args[0])
        elif 'x' in kwargs or 'y' in kwargs:
            return self.get_wells_by_xy(**kwargs)
        elif 'to' in kwargs or 'length' in kwargs or 'step' in kwargs:
            return self.get_wells_by_to_and_length(*args, **kwargs)
        elif len(args) == 1:
            return self.get_well_by_type(args[0])
        else:
            return self._flatten_well_list(args)

    def well(self, name: str) -> lw.Well:
        """
        Returns well by :name:
        """
        return super().__getitem__(name)

    def columns(self, *args):
        if len(args) == 1:
            return super().columns(args)[0]
        else:
            return super().columns(args)

    def cols(self, *args):
        return self.columns(*args)

    def rows(self, *args):
        if len(args) == 1:
            return super().rows(args)[0]
        else:
            return super().rows(args)
