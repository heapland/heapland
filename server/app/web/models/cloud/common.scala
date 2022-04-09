package web.models.cloud

import com.heapland.commons.models.ClusterProvider.ClusterProvider
import com.heapland.commons.models.RunStatus.RunStatus
import com.heapland.commons.models.RunStatus

case class CloudCluster(name: String, id: String, provider: ClusterProvider)
case class ClusterProcess(name: String, host: String, port: Int, pid: Option[Long] = None, status: RunStatus = RunStatus.NotStarted)
