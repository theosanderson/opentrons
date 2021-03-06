""" protocol_api: The user-facing API for OT2 protocols.

This package defines classes and functions for access through a protocol to
control the OT2.

"""
from ..protocols import types

MAX_SUPPORTED_VERSION = types.APIVersion(2, 0)
#: The maximum supported protocol API version in this release

from . import labware  # noqa(E402)
from .contexts import (ProtocolContext,  # noqa(E402)
                       InstrumentContext,
                       TemperatureModuleContext,
                       MagneticModuleContext,
                       ThermocyclerContext)

__all__ = ['ProtocolContext',
           'InstrumentContext',
           'TemperatureModuleContext',
           'MagneticModuleContext',
           'ThermocyclerContext',
           'labware']
