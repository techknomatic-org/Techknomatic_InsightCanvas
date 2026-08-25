// Copyright (c) Techknomatic Services Pvt Ltd.
// Licensed under the MIT License.

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import { DataFormulatorState, dfActions } from '../../app/dfSlice';
import { AppDispatch } from '../../app/store';
import { generateUUID } from '../../app/identity';
import { apiRequest } from '../../app/apiClient';
import { CONNECTOR_URLS, CONNECTOR_ACTION_URLS } from '../../app/utils';
import { ConnectorInstance } from '../../components/ComponentType';

import { DataSourceSelector } from './DataSourceSelector';
import { DatabaseSelector, DatabaseItem } from './DatabaseSelector';
import { TableSelector, CatalogTableItem } from './TableSelector';
import { IntelligenceWorkspace } from './IntelligenceWorkspace';
import { profileTables } from './intelligenceService';
import { DataProfile } from './intelligenceTypes';

type Step = 'sources' | 'databases' | 'tables' | 'workspace';

function generateSessionId(): string {
    const now = new Date();
    const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const time = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    const short = generateUUID().slice(0, 4);
    return `session_${date}_${time}_${short}`;
}

export const IntelligenceHubView: React.FC = () => {
    const dispatch = useDispatch<AppDispatch>();
    const [step, setStep] = useState<Step>('sources');

    // Data Source State
    const [connectors, setConnectors] = useState<ConnectorInstance[]>([]);
    const [loadingConnectors, setLoadingConnectors] = useState<boolean>(true);
    const [connectorsError, setConnectorsError] = useState<string | null>(null);
    const [selectedConnector, setSelectedConnector] = useState<ConnectorInstance | null>(null);

    // Database State
    const [databases, setDatabases] = useState<DatabaseItem[]>([]);
    const [loadingDatabases, setLoadingDatabases] = useState<boolean>(false);
    const [databasesError, setDatabasesError] = useState<string | null>(null);
    const [selectedDatabase, setSelectedDatabase] = useState<DatabaseItem | null>(null);

    // Tables State
    const [tables, setTables] = useState<CatalogTableItem[]>([]);
    const [selectedTableNames, setSelectedTableNames] = useState<Set<string>>(new Set());
    const [loadingTables, setLoadingTables] = useState<boolean>(false);
    const [tablesError, setTablesError] = useState<string | null>(null);

    // Workspace & Profile State
    const [profile, setProfile] = useState<DataProfile | null>(null);
    const [profiling, setProfiling] = useState<boolean>(false);
    const [profileError, setProfileError] = useState<string | null>(null);

    // Active workspace from Redux state
    const activeWorkspace = useSelector((state: DataFormulatorState) => state.activeWorkspace);

    // Selected model from Redux state
    const selectedModelId = useSelector((state: DataFormulatorState) => state.selectedModelId);
    const models = useSelector((state: DataFormulatorState) => state.models);
    const globalModels = useSelector((state: DataFormulatorState) => state.globalModels);

    const activeModel = useMemo(() => {
        const all = [...(models || []), ...(globalModels || [])];
        return all.find((m) => m.id === selectedModelId) || globalModels?.[0] || models?.[0];
    }, [models, globalModels, selectedModelId]);

    // 1. Fetch connected data sources
    const loadConnectors = useCallback(async () => {
        setLoadingConnectors(true);
        setConnectorsError(null);
        try {
            const { data } = await apiRequest<{ connectors: ConnectorInstance[] }>(CONNECTOR_URLS.LIST, {
                method: 'GET',
            });
            setConnectors(data.connectors || []);
        } catch (err: any) {
            setConnectorsError(err?.message || 'Failed to load connected data sources');
        } finally {
            setLoadingConnectors(false);
        }
    }, []);

    useEffect(() => {
        loadConnectors();
    }, [loadConnectors]);

    // 2. Select Source -> Fetch Catalog Tree & Extract Databases
    const handleSelectSource = async (connector: ConnectorInstance) => {
        setSelectedConnector(connector);
        setLoadingDatabases(true);
        setDatabasesError(null);
        setStep('databases');

        try {
            const { data } = await apiRequest<{ tree: any[]; hierarchy: any[] }>(CONNECTOR_ACTION_URLS.GET_CATALOG_TREE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ connector_id: connector.id }),
            });

            const tree = data.tree || [];
            const dbList: DatabaseItem[] = [];
            tree.forEach((node) => {
                if (node.node_type === 'database' || node.node_type === 'folder' || node.node_type === 'dataset') {
                    dbList.push({
                        id: node.name,
                        name: node.name,
                        nodeType: node.node_type,
                        path: node.path || [node.name],
                        children: node.children || [],
                    });
                }
            });

            if (dbList.length === 0 && tree.length > 0) {
                dbList.push({
                    id: connector.display_name || connector.id,
                    name: connector.display_name || connector.id,
                    nodeType: 'database',
                    path: [connector.id],
                    children: tree,
                });
            }

            setDatabases(dbList);
        } catch (err: any) {
            setDatabasesError(err?.message || 'Failed to load database catalog');
        } finally {
            setLoadingDatabases(false);
        }
    };

    // 3. Select Database -> Extract Tables
    const handleSelectDatabase = (db: DatabaseItem) => {
        setSelectedDatabase(db);
        setTablesError(null);
        setStep('tables');

        const tableList: CatalogTableItem[] = [];
        const extractTablesRecursive = (nodes: any[]) => {
            nodes.forEach((n) => {
                if (n.node_type === 'table' || n.node_type === 'file' || (!n.children && n.name)) {
                    tableList.push({
                        id: n.name,
                        name: n.name,
                        path: n.path || [n.name],
                        metadata: n.metadata,
                    });
                }
                if (n.children && n.children.length > 0) {
                    extractTablesRecursive(n.children);
                }
            });
        };

        if (db.children && db.children.length > 0) {
            extractTablesRecursive(db.children);
        }

        setTables(tableList);
        if (tableList.length > 0 && tableList.length <= 5) {
            setSelectedTableNames(new Set(tableList.map((t) => t.name)));
        } else {
            setSelectedTableNames(new Set());
        }
    };

    // 4. Toggle Table Selection
    const handleToggleTable = (tableName: string) => {
        setSelectedTableNames((prev) => {
            const next = new Set(prev);
            if (next.has(tableName)) next.delete(tableName);
            else next.add(tableName);
            return next;
        });
    };

    const handleSelectAll = () => {
        setSelectedTableNames(new Set(tables.map((t) => t.name)));
    };

    const handleDeselectAll = () => {
        setSelectedTableNames(new Set());
    };

    // 5. Proceed -> Ingest & Profile Tables
    const handleProceedToAnalysis = async () => {
        if (!selectedConnector || selectedTableNames.size === 0) return;

        setProfiling(true);
        setProfileError(null);

        // Ensure active workspace exists so all requests carry X-Workspace-Id
        let currentWs = activeWorkspace;
        if (!currentWs) {
            const newWsId = generateSessionId();
            currentWs = { id: newWsId, displayName: selectedDatabase?.name || 'Intelligence Hub' };
            dispatch(dfActions.setActiveWorkspace(currentWs));
        }

        // Build lookup from table name -> CatalogTableItem for path info
        const tableItemMap = new Map<string, CatalogTableItem>();
        tables.forEach((t) => tableItemMap.set(t.name, t));

        const tablesToLoad = Array.from(selectedTableNames);
        const dbName = selectedDatabase?.name;

        try {
            // Ingest tables into workspace if needed
            for (const tName of tablesToLoad) {
                const tableItem = tableItemMap.get(tName);
                // Use catalog path if available (e.g. ["insightcanvas", "dim_customer"]),
                // otherwise construct database-qualified path from selected database.
                const catalogPath = tableItem?.path && tableItem.path.length > 0
                    ? tableItem.path
                    : (dbName ? [dbName, tName] : [tName]);

                // For MySQL: source_table.name should be "database.table" to qualify the query
                const qualifiedName = catalogPath.length > 1
                    ? catalogPath.join('.')
                    : tName;

                try {
                    await apiRequest(CONNECTOR_ACTION_URLS.IMPORT_DATA, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            connector_id: selectedConnector.id,
                            table_name: tName,
                            source_table: {
                                name: qualifiedName,
                                path: catalogPath,
                            },
                        }),
                    });
                } catch (importErr) {
                    console.warn('Import table warning:', tName, importErr);
                }
            }

            // Profile tables in workspace
            const prof = await profileTables(tablesToLoad, selectedConnector.id);
            setProfile(prof);
            setStep('workspace');
        } catch (err: any) {
            setProfileError(err?.message || 'Failed to profile selected tables');
        } finally {
            setProfiling(false);
        }
    };


    // Reset to start
    const handleReset = () => {
        setStep('sources');
        setSelectedConnector(null);
        setSelectedDatabase(null);
        setSelectedTableNames(new Set());
        setProfile(null);
    };

    return (
        <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#f8fafc', overflow: 'hidden' }}>
            {profiling ? (
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                    <CircularProgress size={40} sx={{ color: '#1B75BB' }} />
                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#001d52' }}>
                        Profiling Selected Data...
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Analyzing schemas, data types, cardinality, and dimensions for Intelligence Hub
                    </Typography>
                </Box>
            ) : profileError ? (
                <Box sx={{ p: 4, maxWidth: 600, mx: 'auto' }}>
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {profileError}
                    </Alert>
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                        <Typography
                            component="span"
                            onClick={() => setProfileError(null)}
                            sx={{ color: '#1B75BB', cursor: 'pointer', fontWeight: 600 }}
                        >
                            ← Back to Table Selection
                        </Typography>
                    </Box>
                </Box>
            ) : (
                <>
                    {step === 'sources' && (
                        <DataSourceSelector
                            connectors={connectors}
                            loading={loadingConnectors}
                            error={connectorsError}
                            onSelectSource={handleSelectSource}
                        />
                    )}

                    {step === 'databases' && selectedConnector && (
                        <DatabaseSelector
                            connector={selectedConnector}
                            databases={databases}
                            loading={loadingDatabases}
                            error={databasesError}
                            onSelectDatabase={handleSelectDatabase}
                            onBack={() => setStep('sources')}
                            onRetry={() => handleSelectSource(selectedConnector)}
                        />
                    )}

                    {step === 'tables' && selectedDatabase && selectedConnector && (
                        <TableSelector
                            databaseName={selectedDatabase.name}
                            tables={tables}
                            selectedTables={selectedTableNames}
                            loading={loadingTables}
                            error={tablesError}
                            onToggleTable={handleToggleTable}
                            onSelectAll={handleSelectAll}
                            onDeselectAll={handleDeselectAll}
                            onProceed={handleProceedToAnalysis}
                            onBack={() => setStep('databases')}
                        />
                    )}

                    {step === 'workspace' && profile && selectedConnector && selectedDatabase && (
                        <IntelligenceWorkspace
                            sourceId={selectedConnector.id}
                            databaseName={selectedDatabase.name}
                            tableNames={Array.from(selectedTableNames)}
                            profile={profile}
                            onReset={handleReset}
                            modelConfig={activeModel}
                        />
                    )}
                </>
            )}
        </Box>
    );
};
