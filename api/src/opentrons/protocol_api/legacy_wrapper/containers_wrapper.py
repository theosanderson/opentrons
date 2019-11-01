import functools
import inspect
import logging

from .util import log_call, decorator_maker
from opentrons import types
from opentrons.protocol_api import labware as lw
# from opentrons.protocol_api.contexts import ProtocolContext
from typing import List, Union, Callable, Dict

log = logging.getLogger(__name__)


# class Containers():
#     def __init__(self,
#                  protocol_ctx: ProtocolContext):
#         self._ctx = protocol_ctx
#
#     @log_call(log)
#     def load(self,
#              container_name: str,
#              slot: types.DeckLocation,
#              label: str = None,
#              share: bool = False):
#         """
#         Examples
#         --------
#         >>> from opentrons import containers
#         >>> containers.load('96-flat', '1')
#         <Deck>/<Slot 1>/<Container 96-flat>
#         >>> containers.load('96-flat', '4', 'plate')
#         <Deck>/<Slot 4>/<Container plate>
#         >>> containers.load('non-existent-type', '4') # doctest: +ELLIPSIS
#         Exception: Container type "non-existent-type" not found in file ...
#         """
#         if self._ctx._deck_layout[slot] and not share:
#             raise RuntimeWarning(
#                 f'Slot {slot} has child. Use "containers.load(\''
#                 f'{container_name}\', \'{slot}\', share=True)"')
#
#         try:
#             return self._ctx.load_labware(
#                 container_name, slot, label, legacy=True)
#         except FileNotFoundError:
#             container_name = container_name.replace('-', '_')
#             return self._ctx.load_labware(
#                 container_name,
#                 slot,
#                 label,
#                 namespace='legacy_api',
#                 legacy=True)
#
#     @log_call(log)
#     def list(self):
#         return lw.get_all_labware_definitions()
#
#     @log_call(log)
#     def create(self, name, grid, spacing, diameter, depth, volume=0):
#         """
#         Creates a labware definition based on a rectangular gird, depth,
#         diameter, and spacing. Note that this function can only create labware
#         with regularly spaced wells in a rectangular format, of equal height,
#         depth, and radius. Irregular labware defintions will have to be made in
#         other ways or modified using a regular definition as a starting point.
#         Also, upon creation a definition always has its lower-left well at
#         (0, 0, 0), such that this labware _must_ be calibrated before use.
#
#         :param name: the name of the labware to be used with `labware.load`
#         :param grid: a 2-tuple of integers representing (<n_columns>, <n_rows>)
#         :param spacing: a 2-tuple of floats representing
#             (<col_spacing, <row_spacing)
#         :param diameter: a float representing the internal diameter of each
#             well
#         :param depth: a float representing the distance from the top of each
#             well to the internal bottom of the same well
#         :param volume: [optional] the maximum volume of each well
#         :return: the labware object created by this function
#         """
#         return None



# def determine_signature_1(f, *args):
#
#     @functools.wraps(determine_signature_1)
#     def _decorator(f: Callable) -> Callable:
#
#         if args:
#             @functools.wraps(f)
#             def _wrapper(*args):
#                 return f(*args)
#         return _wrapper
#
#     return _decorator
#
#
# def determine_signature_2(f, *args):
#
#     @functools.wraps(determine_signature_2)
#     def _decorator(f: Callable) -> Callable:
#
#         if not args:
#             @functools.wraps(f)
#             def _wrapper():
#                 return f()
#         return _wrapper
#
#     return _decorator


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

        if isinstance(start, str):
            start = self.get_index_by_name(start)
        if not stop:
            indices = slice(start, length + start, step)
        else:
            if isinstance(stop, str):
                stop = self.get_index_by_name(stop)
            indices = slice(start, stop, step)
        return self._wells_by_index[indices]

    @property
    def properties(self) -> Dict:
        return self._properties

    # def __call__(self, *args, **kwargs):
    #     """
    #     Passes all arguments to Wells() and returns result
    #     """
    #     return self.wells(*args, **kwargs)
    #
    # def __getitem__(self, name: Union[str, int, slice]):
    #     if isinstance(name, int) or isinstance(name, str):
    #         return self.wells(name)
    #     elif isinstance(name, slice):
    #         return self.wells()[slice]
    #     else:
    #         raise TypeError('Expected int, slice, or str, got '
    #                         f'{type(name)} instead')
    #
    def get_well_by_type(
            self,
            well: Union[int, str, slice]) -> Union[List[lw.Well], lw.Well]:
        if isinstance(well, int):
            return self._wells_by_index[well]
        elif isinstance(well, str):
            return self._wells_by_name[well]
        else:
            raise TypeError(f"Type {type(well)} is not compatible.")

    @staticmethod
    @decorator_maker
    def wells(*args,
              **kwargs) -> List[Union[List[lw.Well], lw.Well]]:
        """
        Returns child Well or list of child Wells
        """
        if not kwargs:
            if not args:
                return self._wells_by_index
            elif len(args) == 1:
                return self.get_well_by_type(args[0])
            else:
                new_wells = []
                for arg in args:
                    if isinstance(arg, List):
                        for item in arg:
                            new_wells.append(self.get_well_by_type(item))
                    else:
                        new_wells.append(self.get_well_by_type(arg))
                return new_wells
        else:
            if 'x' in kwargs or 'y' in kwargs:
                return self.get_wells_by_xy(**kwargs)
            else:
                return self.get_wells_by_to_and_length(*args, **kwargs)

    # @property
    # def wells(self):
    #     return self._wells_by_index

    def well(self, name: str) -> lw.Well:
        """
        Returns well by :name:
        """
        return super().__getitem__(name)

    @decorator_maker
    def columns(self, *args):
        if len(args) == 1:
            return super().columns(*args)[0]
        else:
            return super().columns(*args)

    def cols(self, *args):
        return self.columns(*args)

    def rows(self, *args):
        if len(args) == 1:
            return super().rows(*args)[0]
        else:
            return super().rows(*args)
