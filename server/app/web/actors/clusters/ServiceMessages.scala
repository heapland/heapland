package web.actors.clusters

import com.heapland.commons.models.RunStatus.RunStatus

object ServiceMessages {

  case object InitClusterState
  case object StartCluster
  case object StopCluster
  case object DeleteCluster
  case class UpdateFromProcess(name: String, status: RunStatus)

}
