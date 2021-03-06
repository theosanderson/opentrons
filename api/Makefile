# opentrons api makefile

SHELL := /bin/bash

# add yarn CLI dev deps to PATH (for cross platform POSIX commands via shx)
# and also make an explicit version for shx for use in the shell function,
# where PATH won’t be propagated
PATH := $(shell cd .. && yarn bin):$(PATH)
SHX := npx shx

# make push wheel file (= rather than := to expand at every use)
firmware = $(wildcard smoothie/*.hex)

# python and pipenv config
pipenv_envvars := $(and $(CI),PIPENV_IGNORE_VIRTUALENVS=1)
python := $(pipenv_envvars) pipenv run python
pip := $(pipenv_envvars) pipenv run pip
pytest := $(pipenv_envvars) pipenv run py.test
sphinx_build := $(pipenv_envvars) pipenv run sphinx-build
pipenv_opts := --dev
pipenv_opts += $(and $(CI),--keep-outdated --clear)
wheel_opts := $(if $(or $(CI),$(V),$(VERBOSE)),,-q)


# Find the version of the wheel from package.json using a helper script. We
# use python here so we can use the same version normalization that will be
# used to create the wheel.
wheel_file = dist/opentrons-$(shell $(python) ../scripts/python_build_utils.py api normalize_version)-py2.py3-none-any.whl
wheel_pattern := dist/opentrons-%-py2.py3-none-any.whl

# These variables are for simulating python protocols
sim_log_level ?= info
simfile ?=

# These variables can be overriden when make is invoked to customize the
# behavior of pytest. For instance,
# make test tests=tests/opentrons/tools/test_qc_scripts.py would run only the
# specified test
tests ?= tests
test_opts ?=  --cov --cov-report term-missing:skip-covered --cov-report xml:coverage.xml

# These variables must be overridden when make deploy or make deploy-staging is run
# to set the auth details for pypi
pypi_username ?=
pypi_password ?=

# Host key location for buildroot robot
br_ssh_key ?= ~/.ssh/robot_key
# Pubkey location for buildroot robot to install with install-key
br_ssh_pubkey ?= $(br_ssh_key).pub
# Other SSH args for buildroot robots
ssh_opts ?= -o stricthostkeychecking=no -o userknownhostsfile=/dev/null

twine_auth_args := --username $(pypi_username) --password $(pypi_password)

# Source discovery
# For the python sources
ot_py_sources := $(filter %.py,$(shell $(SHX) find src/opentrons/))
# And the out of tree shared data
ot_shared_data_sources := $(filter %.json,$(shell $(SHX) find ../shared-data/))
# And the arbitrary stuff in resources
ot_resources := $(filter %,$(shell $(SHX) find src/opentrons/resources))
modules_configs := $(filter %.rules,$(shell $(SHX) find src/opentrons/config/modules))
ot_sources := $(ot_py_sources) $(ot_shared_data_sources) $(ot_resources) $(modules_configs)

# Defined separately than the clean target so the wheel file doesn’t have to
# depend on a PHONY target
clean_cmd = $(SHX) rm -rf build dist .coverage coverage.xml '*.egg-info' '**/__pycache__' '**/*.pyc'

.PHONY: all
all: clean wheel

.PHONY: install
install:
	$(pipenv_envvars) pipenv sync $(pipenv_opts)
	$(pipenv_envvars) pipenv run pip freeze

.PHONY: clean
clean: docs-clean
	$(clean_cmd)

.PHONY: uninstall
uninstall:
	$(pipenv_envvars)	pipenv --rm

$(wheel_pattern): setup.py $(ot_sources)
	$(clean_cmd)
	$(python) setup.py $(wheel_opts) bdist_wheel
	$(SHX) rm -rf build
	$(SHX) ls dist

wheel: $(wheel_file)

.PHONY: test, test-apiv1, test-apiv2
test: local-install test-apiv2 test-apiv1
	$(python)	-m twine check $(wheel_file)

test-apiv2: local-install
	OT_API_FF_useProtocolApi2=1 $(pytest) $(tests) $(test_opts) -m "not apiv1 and not api1_only"

test-apiv1: local-install
	OT_API_FF_useProtocolApi2=0 $(pytest) $(tests) $(test_opts) -m "not apiv2 and not api2_only"

.PHONY: lint
lint: $(ot_py_sources)
	$(python) -m mypy src/opentrons
	$(python) -m pylama src/opentrons tests

docs/build/html/v%: docs/v% local-install
	$(sphinx_build) -b html -d docs/build/doctrees -n $< $@
	$(SHX) cp docs/img/lightbulb.jpg $@/_images/ # sphinx wont automatically do this because it's only in a template

docs/build/pdf/OpentronsPythonAPIV%.pdf: docs/v% local-install
	$(sphinx_build) -b latex -d docs/build/doctrees $< $(@D)
	$(MAKE) -C $(@D) all-pdf $(if $(CI),>/dev/null,|| $(SHX) echo "latex build failed (pdflatex not installed?)")
	$(SHX) ls $(@D)/*.pdf $(if $(CI),,|| $(SHX) echo "no pdf produced")

docs/dist/v%: docs/build/html/v% docs/build/pdf/OpentronsPythonAPIV%.pdf
	$(SHX) mkdir -p $@
	$(SHX) cp -R $^ $(@D) $(if $(CI),,|| true)

docs/dist/ot1: docs/ot1
	$(SHX) mkdir -p $@
	$(SHX) cp -R $< $(@D)

docs/dist/%: docs/root/%
	$(SHX) mkdir -p $(@D)
	$(SHX) cp -R docs/root/* docs/dist/

.PHONY: docs
docs: docs/dist/index.html docs/dist/v1 docs/dist/v2 docs/dist/ot1

.PHONY: docs-clean
docs-clean:
	$(SHX) rm -rf docs/dist docs/build

.PHONY: dev
dev: export ENABLE_VIRTUAL_SMOOTHIE := true
dev: local-install
	$(python) -m opentrons.main -P 31950

.PHONY: local-install
local-install: wheel
	$(pip) install --ignore-installed --no-deps $(wildcard dist/opentrons-*.whl)

.PHONY: local-shell
local-shell: local-install
	$(pipenv_envvars) pipenv shell

.PHONY: simulate
simulate: local-install
	-$(python) -m opentrons.simulate -l $(sim_log_level) $(simfile)

.PHONY: deploy-staging
deploy-staging: wheel
	-$(python) -m twine upload --repository-url "https://test.pypi.org/legacy/"\
                             $(twine_auth_args)\
                             $(wheel_file)

.PHONY: deploy
deploy: wheel
	$(python) -m twine upload $(twine_auth_args)\
                            $(wheel_file)

.PHONY: push-balena
push-balena: wheel
	curl -X POST \
		-H "Content-Type: multipart/form-data" \
		-F "whl=@$(wildcard dist/opentrons-*.whl)" \
		http://$(host):31950/server/update

.PHONY: push
push: wheel
	scp -i $(br_ssh_key) $(ssh_opts) $(wheel_file) root@$(host):/data/
	ssh -i $(br_ssh_key) $(ssh_opts) root@$(host) \
"function cleanup () { rm -f /data/opentrons*.whl && mount -o remount,ro / && systemctl start opentrons-api-server; } ;\
systemctl stop opentrons-api-server &&\
mount -o remount,rw / &&\
cd /usr/lib/python3.7/site-packages &&\
unzip -o /data/opentrons-*.whl && cleanup || cleanup"

.PHONY: install-key
install-key:
	curl -X POST $(host):31950/server/ssh_keys\
		-H "Content-Type: application/json"\
		-d "{\"key\":\"$(shell cat $(br_ssh_pubkey))\"}"

.PHONY: restart
restart:
	curl -X POST http://$(host):31950/server/restart

.PHONY: change-right
change-right:
	curl -X POST \
		-H "Content-Type: application/json" \
		-d '{"target": "mount", "mount": "right", "point": [65, 40, 30]}' \
		http://$(host):31950/robot/move
	curl -X POST \
		-H "Content-Type: application/json" \
		-d '{"axes": ["c"]}' \
		http://$(host):31950/motors/disengage


.PHONY: change-left
change-left:
	curl -X POST \
		-H "Content-Type: application/json" \
		-d '{"target": "mount", "mount": "left", "point": [325, 40, 30]}' \
		http://$(host):31950/robot/move
	curl -X POST \
		-H "Content-Type: application/json" \
		-d '{"axes": ["b"]}' \
		http://$(host):31950/motors/disengage

# User must currently specify host, e.g.: `make term host=169.254.202.176`
.PHONY: term
term:
	ssh -i $(br_ssh_key) $(ssh_opts) root@$(host)
